#!/usr/bin/env node
/**
 * End-to-end test of the in-browser flasher with an emulated ESP32.
 *
 *   npm run test:e2e                     # starts `next dev -p 3102` itself (or reuses the dev server
 *                                        #   Next reports as already running for this project)
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * Optional:
 *   E2E_VERBOSE=1                 dump the fake device log and browser console on every scenario
 *   E2E_WORKAROUND_CHIPNAME=1     diagnostic only — rewrite `loader.main()` in the served engine chunk so the
 *                                 engine uses `loader.chip.CHIP_NAME` as chip family. Never touches src/.
 *
 * Scenario 1  ESP32-C6 (USB-JTAG/serial): click "Kết nối thiết bị", then "Nạp firmware ESP32-C6", expect "Đã nạp xong",
 *             then verify the virtual flash is byte-identical to firmware/<id>/<version> at the manifest offsets, that
 *             nothing was downloaded or turned into a blob: URL, that the ChipCard says ESP32-C6, and that the
 *             /api/flash/part responses are not plaintext.
 * Scenario 2  classic ESP32 (CP2102): expect the incompatibility callout "không có bản dựng cho ESP32".
 *
 * Exit code is non-zero when any check fails.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const FAKE_PATH = path.join(HERE, "fake-esp-serial.js");
const FIRMWARE_ID = process.env.FW_ID ?? "cong-tac-den-matter-thread-c6";
const PAGE_PATH = `/firmware/${FIRMWARE_ID}`;
const DEV_PORT = 3102;
const VERBOSE = process.env.E2E_VERBOSE === "1";
const WORKAROUND = process.env.E2E_WORKAROUND_CHIPNAME === "1";
const FAKE_MAC = "40:4c:ca:12:34:56";
const NAV_TIMEOUT = 180_000;
const FLOW_TIMEOUT = 150_000;

/* ------------------------------------------------------------------ */
/* reporting                                                            */
/* ------------------------------------------------------------------ */
const results = [];
let scenarioName = "";
function check(name, ok, detail = "") {
  results.push({ scenario: scenarioName, name, ok: !!ok, detail: String(detail) });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function info(name, detail = "") {
  console.log(`  INFO  ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  console.log(`  WARN  ${name}${detail ? ` — ${detail}` : ""}`);
}
const md5hex = (buf) => createHash("md5").update(buf).digest("hex");

/* ------------------------------------------------------------------ */
/* manifest + expected bytes                                            */
/* ------------------------------------------------------------------ */
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "firmware", `${FIRMWARE_ID}.json`), "utf8"));
const c6Build = manifest.builds.find((b) => b.chipFamily === "ESP32-C6");
if (!c6Build) throw new Error("manifest has no ESP32-C6 build");
const expectedParts = c6Build.parts.map((p, index) => {
  const file = path.join(ROOT, "firmware", manifest.id, manifest.version, p.file);
  const bytes = fs.readFileSync(file);
  return { index, file: p.file, label: p.label, offset: typeof p.offset === "string" ? parseInt(p.offset, 16) : p.offset, bytes };
});

/* ------------------------------------------------------------------ */
/* dev server                                                           */
/* ------------------------------------------------------------------ */
function portInUse(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => resolve(false));
  });
}
async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0 && res.status < 500) return;
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = String(e && e.cause ? e.cause.code || e.cause : e);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server at ${url} did not come up within ${timeoutMs} ms (${lastErr})`);
}

/**
 * Starts `npx next dev -p 3102`. Next 16 keeps one dev server per project (.next/dev/lock); when another one is
 * already running it prints its URL and exits — in that case we follow Next's guidance and use that server.
 */
async function startDevServer() {
  const child = spawn("npx", ["next", "dev", "-p", String(DEV_PORT)], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none", NEXT_TELEMETRY_DISABLED: "1" },
  });
  let output = "";
  const onData = (d) => {
    output += d.toString();
    if (VERBOSE) process.stdout.write(d);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const result = await new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn, v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      fn(v);
    };
    const timer = setTimeout(() => settle(reject, new Error(`next dev did not report readiness:\n${output}`)), 120_000);
    // Next prints "✓ Ready in …" *before* it checks .next/dev/lock, so give a lock conflict a moment to surface
    // (the losing process exits within a few hundred ms) before trusting the ready line.
    let readySince = 0;
    const poll = setInterval(() => {
      if (!readySince && /Ready in/.test(output)) readySince = Date.now();
      if (readySince && Date.now() - readySince > 2000 && child.exitCode === null) {
        settle(resolve, { child, baseUrl: `http://localhost:${DEV_PORT}`, reused: false });
      }
    }, 200);
    child.on("exit", (code) => {
      const m = output.match(/already running[\s\S]*?- Local:\s+(http:\/\/\S+)/);
      if (m) settle(resolve, { child: null, baseUrl: m[1].replace(/\/$/, ""), reused: true, output });
      else settle(reject, new Error(`next dev exited with code ${code}:\n${output}`));
    });
  });
  return result;
}
async function stopDevServer(child) {
  if (!child || child.exitCode !== null) return;
  const pid = child.pid;
  const signalGroup = (sig) => {
    try {
      process.kill(-pid, sig); // the whole process group: npx → next → next-server
    } catch {
      try {
        process.kill(pid, sig);
      } catch {
        /* already gone */
      }
    }
  };
  signalGroup("SIGTERM");
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline && (await portInUse(DEV_PORT))) await new Promise((r) => setTimeout(r, 250));
  if (await portInUse(DEV_PORT)) {
    signalGroup("SIGKILL");
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`dev server on :${DEV_PORT} stopped (port in use: ${await portInUse(DEV_PORT)})`);
}

/* ------------------------------------------------------------------ */
/* one browser scenario                                                 */
/* ------------------------------------------------------------------ */
async function runScenario(browser, baseUrl, { chip }) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  const data = {
    downloads: [],
    partResponses: [],
    sessionRequests: [],
    consoleMessages: [],
    pageErrors: [],
    pendingBodies: [],
    patchedChunks: 0,
  };

  if (WORKAROUND) {
    await page.route(
      (url) => /\/_next\/.*\.(m?js)(\?.*)?$/.test(url.href),
      async (route) => {
        const res = await route.fetch();
        const text = await res.text();
        if (text.includes("loader.main()")) {
          data.patchedChunks++;
          const headers = Object.fromEntries(Object.entries(res.headers()).filter(([k]) => !["content-length", "content-encoding"].includes(k.toLowerCase())));
          await route.fulfill({ status: res.status(), headers, body: text.replace(/loader\.main\(\)/g, "loader.main().then(function () { return loader.chip.CHIP_NAME; })") });
        } else {
          await route.fulfill({ response: res });
        }
      },
    );
  }

  await page.addInitScript({ content: `window.__FAKE_ESP_OPTIONS__ = ${JSON.stringify({ chip, flashSizeMB: 4, mac: FAKE_MAC, verbose: false })};` });
  await page.addInitScript({ path: FAKE_PATH });
  await page.addInitScript(() => {
    // Any attempt to turn firmware into a blob: URL (download link, object URL) must fail loudly.
    window.__blobUrlCalls = [];
    const block = (name) =>
      function blocked(obj) {
        window.__blobUrlCalls.push(`${name}(${obj && obj.constructor ? obj.constructor.name : typeof obj})`);
        throw new Error(`${name} blocked by e2e harness`);
      };
    URL.createObjectURL = block("URL.createObjectURL");
    if (window.webkitURL) window.webkitURL.createObjectURL = block("webkitURL.createObjectURL");
  });

  page.on("download", (d) => data.downloads.push(d.suggestedFilename()));
  page.on("pageerror", (e) => data.pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) data.consoleMessages.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("response", (res) => {
    let url;
    try {
      url = new URL(res.url());
    } catch {
      return;
    }
    if (url.pathname === "/api/flash/part") {
      const p = res
        .body()
        .catch(() => null)
        .then((body) => data.partResponses.push({ index: Number(url.searchParams.get("i")), status: res.status(), headers: res.headers(), body }));
      data.pendingBodies.push(p);
    } else if (url.pathname === "/api/flash/session") {
      const p = res
        .text()
        .catch(() => null)
        .then((text) => data.sessionRequests.push({ status: res.status(), postData: res.request().postData(), responseText: text && text.slice(0, 300) }));
      data.pendingBodies.push(p);
    }
  });

  await page.goto(baseUrl + PAGE_PATH, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  // Step 1: connect + detect
  const connectButton = page.getByRole("button", { name: "Kết nối thiết bị" });
  await connectButton.waitFor({ state: "visible", timeout: NAV_TIMEOUT });
  await connectButton.click({ timeout: 60_000 }); // auto-waits for the button to become enabled after hydration

  const step1 = await page
    .waitForFunction(
      () => {
        const txt = document.body.innerText;
        const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
        if (buttons.some((t) => t.startsWith("Nạp firmware "))) return "detected";
        if (txt.includes("không có bản dựng cho") || txt.includes("nhỏ hơn mức firmware cần")) return "incompatible";
        if (buttons.includes("Thử lại")) return "error";
        return null;
      },
      null,
      { timeout: FLOW_TIMEOUT, polling: 100 },
    )
    .then((h) => h.jsonValue())
    .catch(() => "timeout");

  // Step 2: flash (only when the chip was accepted)
  let outcome = step1;
  if (step1 === "detected") {
    await page.getByRole("button", { name: /^Nạp firmware / }).click({ timeout: 10_000 });
    outcome = await page
      .waitForFunction(
        () => {
          const txt = document.body.innerText;
          if (txt.includes("Đã nạp xong")) return "done";
          if ([...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Thử lại")) return "error";
          return null;
        },
        null,
        { timeout: FLOW_TIMEOUT, polling: 100 },
      )
      .then((h) => h.jsonValue())
      .catch(() => "timeout");
  }

  await Promise.allSettled(data.pendingBodies);
  await page.waitForTimeout(300); // let the last React state updates land

  const ui = await page.evaluate(() => {
    const card = [...document.querySelectorAll("div.animate-rise")].find((d) => d.querySelector("dl"));
    const alerts = [...document.querySelectorAll('[role="alert"], [role="status"]')].map((a) => ({ role: a.getAttribute("role"), title: a.querySelector(".font-semibold")?.textContent?.trim() ?? "", text: a.innerText }));
    return {
      chipCard: card
        ? { title: card.querySelector("span.font-semibold")?.textContent?.trim() ?? "", text: card.innerText, dd: [...card.querySelectorAll("dd")].map((d) => d.innerText.trim()) }
        : null,
      alerts,
      blobUrlCalls: window.__blobUrlCalls,
      body: document.body.innerText,
    };
  });

  const fake = await page.evaluate(() => ({ state: window.__fakeEsp.state, log: window.__fakeEsp.log }));

  let logLines = [];
  try {
    await page.getByRole("button", { name: /Nhật ký kỹ thuật/ }).click({ timeout: 5000 });
    logLines = (await page.locator("pre").first().innerText({ timeout: 5000 })).split("\n");
  } catch {
    /* diagnostics only */
  }

  return { page, context, outcome, ui, fake, logLines, data };
}

function dumpDiagnostics(r) {
  console.log("  ---- diagnostics ----");
  const titles = r.ui.alerts.map((a) => `${a.role}: ${a.title || a.text.split("\n")[0]}`);
  console.log(`  UI callouts: ${JSON.stringify(titles)}`);
  console.log(`  ChipCard: ${JSON.stringify(r.ui.chipCard && { title: r.ui.chipCard.title, dd: r.ui.chipCard.dd })}`);
  console.log(`  session requests: ${JSON.stringify(r.data.sessionRequests)}`);
  console.log(`  fake state: ${JSON.stringify(r.fake.state)}`);
  if (r.data.pageErrors.length) console.log(`  page errors: ${JSON.stringify(r.data.pageErrors)}`);
  if (r.data.consoleMessages.length) console.log(`  console: ${JSON.stringify(r.data.consoleMessages.slice(0, 10))}`);
  console.log(`  Nhật ký kỹ thuật (${r.logLines.length} lines):`);
  for (const l of r.logLines.slice(-25)) console.log(`    | ${l}`);
  if (VERBOSE) {
    console.log("  fake log:");
    for (const e of r.fake.log) console.log(`    ${JSON.stringify(e)}`);
  } else {
    console.log("  fake log (last 15 entries; E2E_VERBOSE=1 for all):");
    for (const e of r.fake.log.slice(-15)) console.log(`    ${JSON.stringify(e)}`);
  }
}

/* ------------------------------------------------------------------ */
/* scenario 1: ESP32-C6 happy path                                      */
/* ------------------------------------------------------------------ */
async function scenarioC6(browser, baseUrl) {
  scenarioName = "ESP32-C6 flash";
  console.log(`\n[${scenarioName}] ${baseUrl}${PAGE_PATH}${WORKAROUND ? "  (E2E_WORKAROUND_CHIPNAME active)" : ""}`);
  const r = await runScenario(browser, baseUrl, { chip: "esp32c6" });
  const { outcome, ui, fake, data } = r;
  const st = fake.state;
  if (WORKAROUND) info("engine chunks patched", String(data.patchedChunks));

  const firstAlert = ui.alerts.find((a) => a.role === "alert");
  check('UI reached success state "Đã nạp xong"', outcome === "done", outcome === "done" ? "" : `outcome=${outcome}${firstAlert ? `: "${firstAlert.title}"` : ""}`);
  check("fake device reported no protocol errors", st.errors.length === 0, st.errors.length ? JSON.stringify(st.errors.slice(0, 3)) : "0 errors");
  // During flashing the chip must be running the stub at 460800; afterwards the engine resets it (RTS pulse),
  // which the fake models as a reboot into ROM at 115200 — so inspect the log rather than the final state.
  const stubStarted = fake.log.some((e) => e.ev === "stub-start");
  const openedFast = fake.log.some((e) => e.ev === "open" && e.baudRate === 460800);
  const wroteInStub = fake.log.some((e) => e.name === "FLASH_DEFL_BEGIN" && e.mode === "stub");
  const resetsAfterWrite = (() => {
    const lastWrite = fake.log.map((e, i) => (e.name === "FLASH_DEFL_END" ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
    return fake.log.some((e, i) => e.ev === "reset" && i > lastWrite);
  })();
  check("chip ran the stub at 460800 while flashing, then was reset into its app", stubStarted && openedFast && wroteInStub && resetsAfterWrite, `stub=${stubStarted} open@460800=${openedFast} writesInStub=${wroteInStub} resetAfterWrite=${resetsAfterWrite} final mode=${st.mode}`);

  // ChipCard
  const card = ui.chipCard;
  check('ChipCard shows chip "ESP32-C6"', card && card.title === "ESP32-C6", card ? `title="${card.title}"` : "no ChipCard rendered");
  check("ChipCard shows MAC, 4MB flash, USB-JTAG/serial, compatible", card && card.text.includes(FAKE_MAC) && card.dd.includes("4MB") && /USB.JTAG\/serial/.test(card.text) && card.text.includes("Tương thích") && !card.text.includes("Không tương thích"), card ? `dd=${JSON.stringify(card.dd)}` : "");

  // Virtual flash contents
  const flashSize = st.flashSize;
  const sorted = [...expectedParts].sort((a, b) => a.offset - b.offset);
  for (const p of sorted) {
    const got = Buffer.from(await r.page.evaluate(([o, l]) => window.__fakeEsp.dump(o, l), [p.offset, p.bytes.length]), "base64");
    const same = got.equals(p.bytes);
    let detail = `md5 ${md5hex(got)}`;
    if (!same) {
      const firstDiff = got.findIndex((b, i) => b !== p.bytes[i]);
      detail = st.flashWrites.length === 0 ? "nothing was written to flash (no FLASH_BEGIN / FLASH_DEFL_BEGIN received)" : `first difference at +0x${firstDiff.toString(16)}: got 0x${got[firstDiff].toString(16)} want 0x${p.bytes[firstDiff].toString(16)} (image starts 0x${p.bytes[0].toString(16)}, so no flash-param patching expected)`;
    }
    check(`flash @0x${p.offset.toString(16)} == ${p.file} (${p.bytes.length} B)`, same, detail);
  }
  // Everything between/after the parts must still be erased (0xFF)
  const gaps = [];
  let cursor = 0;
  for (const p of sorted) {
    if (p.offset > cursor) gaps.push([cursor, p.offset - cursor]);
    cursor = p.offset + p.bytes.length;
  }
  gaps.push([cursor, flashSize - cursor]);
  let gapsOk = true;
  const gapDetail = [];
  for (const [off, len] of gaps) {
    if (len <= 0) continue;
    const got = await r.page.evaluate(([o, l]) => window.__fakeEsp.md5(o, l), [off, len]);
    const want = md5hex(Buffer.alloc(len, 0xff));
    gapsOk = gapsOk && got === want;
    gapDetail.push(`0x${off.toString(16)}+0x${len.toString(16)}:${got === want ? "FF" : "DIRTY"}`);
  }
  check("no other flash bytes touched (gaps and tail still 0xFF)", gapsOk, gapDetail.join(" "));

  // Protocol-level evidence
  const writes = st.flashWrites;
  check("3 compressed writes (FLASH_DEFL_*) at the manifest offsets", writes.length === 3 && writes.every((w) => w.compressed) && JSON.stringify(writes.map((w) => w.offset)) === JSON.stringify(sorted.map((p) => p.offset)), JSON.stringify(writes.map((w) => ({ off: "0x" + w.offset.toString(16), size: w.size, z: w.compressedSize }))));
  const md5ok = st.md5Checks.length === 3 && st.md5Checks.every((m) => expectedParts.some((p) => p.offset === m.addr && p.bytes.length === m.size && md5hex(p.bytes) === m.md5));
  check("SPI_FLASH_MD5 requested for each part and matches the files", md5ok, JSON.stringify(st.md5Checks.map((m) => m.md5.slice(0, 8))));
  const lastMd5 = fake.log.map((e, i) => (e.name === "SPI_FLASH_MD5" ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  const lastSignal = fake.log.map((e, i) => (e.ev === "setSignals" ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  check("hard reset (setSignals) issued after the last MD5 check", lastMd5 >= 0 && lastSignal > lastMd5, `md5@${lastMd5} signals@${lastSignal}`);
  check("port closed after flashing, requestPort called once", st.opened === false && st.requestPortCount === 1, `opened=${st.opened} requestPort=${st.requestPortCount} open/close=${st.openCount}/${st.closeCount}`);

  // No download / blob
  check("no download was triggered", data.downloads.length === 0, data.downloads.length ? JSON.stringify(data.downloads) : "0 download events");
  check("no blob: URL was created", ui.blobUrlCalls.length === 0, ui.blobUrlCalls.length ? JSON.stringify(ui.blobUrlCalls) : "0 createObjectURL calls");

  // Network: encrypted parts
  const parts = [...data.partResponses].sort((a, b) => a.index - b.index);
  check("3 × GET /api/flash/part returned 200", parts.length === 3 && parts.every((p) => p.status === 200), JSON.stringify(parts.map((p) => `${p.index}:${p.status}`)));
  let cipherOk = parts.length === 3;
  const cipherDetail = [];
  for (const p of parts) {
    const exp = expectedParts[p.index];
    if (!exp || !p.body) {
      cipherOk = false;
      cipherDetail.push(`${p.index}:no-body`);
      continue;
    }
    const probe = exp.bytes.subarray(16, 80); // first 64 bytes after offset 16 (the "DEMO PLACEHOLDER" text)
    const leaks = p.body.indexOf(probe) !== -1 || p.body.includes("DEMO PLACEHOLDER");
    const sizeOk = p.body.length === exp.bytes.length + 12 + 16; // IV || ciphertext || tag
    const hdrOk = /octet-stream/.test(p.headers["content-type"] || "") && /no-store/.test(p.headers["cache-control"] || "") && !/attachment/.test(p.headers["content-disposition"] || "");
    cipherOk = cipherOk && !leaks && sizeOk && hdrOk;
    cipherDetail.push(`${p.index}:${leaks ? "PLAINTEXT" : "opaque"}/${p.body.length}B${sizeOk ? "" : "(size?)"}${hdrOk ? "" : "(headers?)"}`);
  }
  check("part responses are not plaintext (IV||ct||tag, octet-stream, no-store)", cipherOk, cipherDetail.join(" "));
  check("no uncaught page errors", data.pageErrors.length === 0, data.pageErrors.length ? data.pageErrors[0] : "");

  if (outcome !== "done" || VERBOSE) dumpDiagnostics(r);
  await r.context.close();
}

/* ------------------------------------------------------------------ */
/* scenario 2: classic ESP32 → incompatible                            */
/* ------------------------------------------------------------------ */
async function scenarioEsp32(browser, baseUrl) {
  scenarioName = "ESP32 incompatible";
  console.log(`\n[${scenarioName}] ${baseUrl}${PAGE_PATH}`);
  const r = await runScenario(browser, baseUrl, { chip: "esp32" });
  const { outcome, ui, fake, data } = r;
  const st = fake.state;
  const callout = ui.alerts.find((a) => a.title.includes("không có bản dựng cho"));

  check('UI shows incompatibility message "không có bản dựng cho ESP32"', outcome === "incompatible" && !!callout && /không có bản dựng cho ESP32/.test(callout.title), callout ? `"${callout.title}"` : `outcome=${outcome}`);
  check("fake device reported no protocol errors", st.errors.length === 0, st.errors.length ? JSON.stringify(st.errors.slice(0, 3)) : `${st.resetCount} reset(s), stub ${st.mode === "stub" ? "running" : "not running"}`);
  check('ChipCard shows the detected chip as "Không tương thích"', ui.chipCard && ui.chipCard.text.includes("Không tương thích") && /^ESP32/.test(ui.chipCard.title), ui.chipCard ? `title="${ui.chipCard.title}"` : "no ChipCard");
  check("no firmware session opened and no parts fetched", data.sessionRequests.length === 0 && data.partResponses.length === 0, `session=${data.sessionRequests.length} parts=${data.partResponses.length}`);
  check("no download / blob: URL", data.downloads.length === 0 && ui.blobUrlCalls.length === 0);
  check("no uncaught page errors", data.pageErrors.length === 0, data.pageErrors.length ? data.pageErrors[0] : "");
  if (callout && callout.title !== "Firmware này không có bản dựng cho ESP32") {
    warn("detected-chip label is not the bare family name", `callout says "${callout.title}" — engine.ts passes loader.main()'s description instead of loader.chip.CHIP_NAME`);
  }
  if (st.opened) {
    warn("serial port left open after the incompatible outcome", "engine.run() returns without cleanup() on the incompatible path; a retry on the same SerialPort will fail with InvalidStateError");
    // Demonstrate the consequence on the real UI: retry with the same (still open) SerialPort object.
    try {
      await r.page.getByRole("button", { name: "Thử lại" }).click({ timeout: 5000 });
      const snapshot = () =>
        r.page.evaluate(() => {
          const alert = document.querySelector('[role="alert"] .font-semibold');
          const phase = (document.body.innerText.match(/Đang [^\n]*…/) || [null])[0];
          const { opened, openCount, closeCount, requestPortCount } = window.__fakeEsp.state;
          const lastOpenError = [...window.__fakeEsp.log].reverse().find((e) => e.ev === "open-rejected");
          return { alert: alert ? alert.textContent.trim() : null, phase, opened, openCount, closeCount, requestPortCount, lastOpenError };
        });
      const deadline = Date.now() + 8000;
      let snap = await snapshot();
      while (Date.now() < deadline && !snap.alert) {
        await r.page.waitForTimeout(250);
        snap = await snapshot();
      }
      if (snap.alert) {
        info("retry after incompatible → UI shows", `"${snap.alert}"`);
      } else {
        warn(
          "retry after incompatible hangs",
          `UI stuck at "${snap.phase}" for 8 s, no error shown; fake: requestPort=${snap.requestPortCount} open/close=${snap.openCount}/${snap.closeCount} opened=${snap.opened}` +
            (snap.lastOpenError ? `, open() rejected: ${snap.lastOpenError.error}` : "") +
            ` — the 2nd Transport.disconnect() waits forever in waitForUnlock() for the 1st transport's readLoop lock`,
        );
      }
    } catch (e) {
      info("retry probe skipped", String(e).split("\n")[0]);
    }
  } else {
    info("serial port closed after the incompatible outcome");
  }

  if (outcome !== "incompatible" || VERBOSE) dumpDiagnostics(r);
  await r.context.close();
}

/* ------------------------------------------------------------------ */
/* main                                                                 */
/* ------------------------------------------------------------------ */
async function main() {
  let devChild = null;
  let browser = null;
  let baseUrl = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, "") : null;
  try {
    if (baseUrl) {
      console.log(`Using BASE_URL=${baseUrl}`);
    } else if (await portInUse(DEV_PORT)) {
      baseUrl = `http://localhost:${DEV_PORT}`;
      console.log(`Port ${DEV_PORT} already serving — using ${baseUrl} (not started by this script, will not be stopped)`);
    } else {
      console.log(`Starting: npx next dev -p ${DEV_PORT}`);
      const started = await startDevServer();
      devChild = started.child;
      baseUrl = started.baseUrl;
      if (started.reused) console.log(`Next reports another dev server for this project is already running — using it: ${baseUrl}`);
      else console.log(`Dev server ready at ${baseUrl} (pid ${devChild.pid})`);
    }
    await waitForHttp(baseUrl + "/", 120_000);
    console.log(`Warming up ${PAGE_PATH} …`);
    await fetch(baseUrl + PAGE_PATH).then((r) => r.text());

    browser = await chromium.launch({ headless: true });
    console.log(`Chromium ${browser.version()} launched; fake device script: ${path.relative(ROOT, FAKE_PATH)}`);

    await scenarioC6(browser, baseUrl);
    await scenarioEsp32(browser, baseUrl);
  } catch (err) {
    scenarioName = "harness";
    check("harness ran to completion", false, String(err && err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : err));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (devChild) await stopDevServer(devChild);
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n==================== SUMMARY ====================");
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.scenario}] ${r.name}`);
  console.log("=================================================");
  console.log(failed.length ? `RESULT: FAIL (${failed.length} of ${results.length} checks failed)` : `RESULT: PASS (${results.length} checks)`);
  process.exit(failed.length ? 1 : 0);
}

main();

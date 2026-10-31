#!/usr/bin/env node
/**
 * Smoke test for the firmware API against a running server.
 *   BASE_URL=http://localhost:3000 FW_ID=<firmware id> CHIP=ESP32-C6 node scripts/smoke-flash-api.mjs
 * Verifies: same-origin gating, token issuance, encrypted part delivery, in-memory decryption,
 * plaintext equality with the file on disk, and rejection of direct navigation / bad tokens.
 */
import { createDecipheriv } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const FW_ID = process.env.FW_ID ?? "smoke-test";
const CHIP = process.env.CHIP ?? "ESP32-C6";

const fetchHeaders = { "sec-fetch-site": "same-origin", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors" };
let failures = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

// 1. Missing Sec-Fetch headers → 403
let r = await fetch(`${BASE}/api/flash/session`, { method: "POST", body: JSON.stringify({ firmwareId: FW_ID, chip: CHIP }), headers: { "content-type": "application/json" } });
check("session without Sec-Fetch headers is rejected", r.status === 403, `status ${r.status}`);

// 2. Cross-site → 403
r = await fetch(`${BASE}/api/flash/session`, { method: "POST", body: JSON.stringify({ firmwareId: FW_ID, chip: CHIP }), headers: { "content-type": "application/json", ...fetchHeaders, "sec-fetch-site": "cross-site" } });
check("cross-site session is rejected", r.status === 403, `status ${r.status}`);

// 3. Incompatible chip → 409
r = await fetch(`${BASE}/api/flash/session`, { method: "POST", body: JSON.stringify({ firmwareId: FW_ID, chip: "ESP8266" }), headers: { "content-type": "application/json", ...fetchHeaders } });
check("incompatible chip → 409 with supported list", r.status === 409 && Array.isArray((await r.json()).supported), `status ${r.status}`);

// 4. Happy path session
r = await fetch(`${BASE}/api/flash/session`, { method: "POST", body: JSON.stringify({ firmwareId: FW_ID, chip: CHIP }), headers: { "content-type": "application/json", ...fetchHeaders } });
check("session issued", r.status === 200, `status ${r.status}`);
check("session response is no-store", (r.headers.get("cache-control") ?? "").includes("no-store"));
const session = await r.json();
check("session has token/key/parts", typeof session.token === "string" && typeof session.key === "string" && session.build?.parts?.length > 0);
const key = Buffer.from(session.key, "base64");
check("key is 32 bytes", key.length === 32);
const nonce = JSON.parse(Buffer.from(session.token.split(".")[0], "base64url").toString()).n;

// 5. Direct navigation to a part → 403
r = await fetch(`${BASE}/api/flash/part?t=${encodeURIComponent(session.token)}&i=0`, { headers: { "sec-fetch-site": "none", "sec-fetch-dest": "document", "sec-fetch-mode": "navigate" } });
check("address-bar navigation to part is rejected", r.status === 403, `status ${r.status}`);

// 6. Tampered token → 403
const tampered = session.token.slice(0, -2) + (session.token.endsWith("A") ? "BB" : "AA");
r = await fetch(`${BASE}/api/flash/part?t=${encodeURIComponent(tampered)}&i=0`, { headers: fetchHeaders });
check("tampered token is rejected", r.status === 403, `status ${r.status}`);

// 7. Out-of-range index → 404
r = await fetch(`${BASE}/api/flash/part?t=${encodeURIComponent(session.token)}&i=${session.build.parts.length}`, { headers: fetchHeaders });
check("out-of-range part index → 404", r.status === 404, `status ${r.status}`);

// 8. Fetch + decrypt every part and compare with disk
const manifest = JSON.parse(await fs.readFile(path.join("content", "firmware", `${FW_ID}.json`), "utf8"));
const build = manifest.builds.find((b) => b.chipFamily === session.build.chipFamily);
for (const part of session.build.parts) {
  r = await fetch(`${BASE}/api/flash/part?t=${encodeURIComponent(session.token)}&i=${part.index}`, { headers: fetchHeaders });
  check(`part ${part.index} served`, r.status === 200, `status ${r.status}`);
  check(`part ${part.index} is no-store, inline, octet-stream`, (r.headers.get("cache-control") ?? "").includes("no-store") && r.headers.get("content-disposition") === "inline" && r.headers.get("content-type") === "application/octet-stream");
  const wire = Buffer.from(await r.arrayBuffer());
  const iv = wire.subarray(0, 12), tag = wire.subarray(wire.length - 16), ct = wire.subarray(12, wire.length - 16);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(Buffer.from(`${nonce}:${part.index}`));
  d.setAuthTag(tag);
  let plain;
  try { plain = Buffer.concat([d.update(ct), d.final()]); } catch (e) { plain = null; }
  check(`part ${part.index} decrypts`, plain !== null);
  if (plain) {
    const onDisk = await fs.readFile(path.join("firmware", manifest.id, manifest.version, build.parts[part.index].file));
    check(`part ${part.index} plaintext equals file on disk (${plain.length} B)`, plain.equals(onDisk));
    check(`part ${part.index} is not stored in plaintext on the wire`, !wire.includes(onDisk.subarray(16, 64)));
  }
  // same part with wrong AAD index must fail
  const d2 = createDecipheriv("aes-256-gcm", key, iv); d2.setAAD(Buffer.from(`${nonce}:${part.index + 1}`)); d2.setAuthTag(tag);
  let swapped = true; try { d2.update(ct); d2.final(); } catch { swapped = false; }
  check(`part ${part.index} rejects swapped index (AAD)`, swapped === false);
}

// 9. Nothing under /firmware is served statically
r = await fetch(`${BASE}/firmware/${manifest.id}/${manifest.version}/${build.parts[0].file}`);
check("firmware store is not reachable as a static path", r.status === 404, `status ${r.status}`);

console.log(failures ? `\n${failures} kiểm tra thất bại` : "\nTất cả kiểm tra đạt.");
process.exit(failures ? 1 : 0);

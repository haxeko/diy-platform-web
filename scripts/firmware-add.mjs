#!/usr/bin/env node
/**
 * Copies real build artefacts into the firmware store and prints a manifest snippet.
 * When FIRMWARE_MASTER_KEY is set the files are stored encrypted at rest (`<file>.enc`,
 * AES-256-GCM, format MNFE v1) so they can live in a public git repository; pass --plain
 * to store them unencrypted.
 *
 * Usage:
 *   npm run firmware:add -- <firmware-id> <version> <chipFamily> <offset>=<path/to.bin> [<offset>=<path/to.bin> ...] [--plain]
 * Example (ESP-IDF, ESP32-C6):
 *   FIRMWARE_MASTER_KEY=$(cat .master.key) npm run firmware:add -- matter-light-c6 1.2.0 ESP32-C6 \
 *     0x0=build/bootloader/bootloader.bin \
 *     0x8000=build/partition_table/partition-table.bin \
 *     0x10000=build/matter-light.bin
 *
 * Typical offsets: ESP32/ESP32-S2: bootloader 0x1000 · S3/C2/C3/C5/C6/H2/P4: bootloader 0x0 · partition table 0x8000 · app 0x10000.
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const plain = argv.includes("--plain");
const [id, version, chipFamily, ...pairs] = argv.filter((a) => a !== "--plain");
if (!id || !version || !chipFamily || pairs.length === 0) {
  console.error("Cách dùng: npm run firmware:add -- <id> <version> <chipFamily> <offset>=<file.bin> [...] [--plain]");
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error("id phải là slug: chữ thường, số, gạch ngang");
  process.exit(1);
}

function parseKey(raw) {
  const v = raw.trim();
  const buf = /^[0-9a-fA-F]{64,}$/.test(v) ? Buffer.from(v, "hex") : Buffer.from(v, "base64");
  if (buf.length < 32) throw new Error("FIRMWARE_MASTER_KEY phải có ít nhất 32 byte (openssl rand -hex 32)");
  return buf;
}
const masterKey = !plain && process.env.FIRMWARE_MASTER_KEY ? parseKey(process.env.FIRMWARE_MASTER_KEY) : null;
if (!masterKey && !plain) {
  console.warn("FIRMWARE_MASTER_KEY chưa đặt → lưu file KHÔNG mã hoá. Đặt biến này (openssl rand -hex 32) để mã hoá at-rest, hoặc dùng --plain để tắt cảnh báo.");
}

function encryptAtRest(data, aad) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from("MNFE", "ascii"), Buffer.from([1]), iv, ct, cipher.getAuthTag()]);
}

const dir = path.join(process.cwd(), "firmware", id, version);
await fs.mkdir(dir, { recursive: true });

const parts = [];
for (const pair of pairs) {
  const eq = pair.indexOf("=");
  if (eq < 0) {
    console.error(`Thiếu dấu '=' trong: ${pair}`);
    process.exit(1);
  }
  const offsetRaw = pair.slice(0, eq);
  const src = pair.slice(eq + 1);
  if (!/^(0x[0-9a-fA-F]+|\d+)$/.test(offsetRaw)) {
    console.error(`Offset không hợp lệ: ${offsetRaw}`);
    process.exit(1);
  }
  const offsetNum = offsetRaw.startsWith("0x") ? Number.parseInt(offsetRaw, 16) : Number(offsetRaw);
  const offset = `0x${offsetNum.toString(16)}`;
  const file = path.basename(src).replace(/[^A-Za-z0-9._-]/g, "_");
  const data = await fs.readFile(src);
  const sha256 = createHash("sha256").update(data).digest("hex");
  if (masterKey) {
    await fs.writeFile(path.join(dir, `${file}.enc`), encryptAtRest(data, `${id}/${version}/${file}`));
    await fs.rm(path.join(dir, file), { force: true });
  } else {
    await fs.writeFile(path.join(dir, file), data);
  }
  const label = /boot/i.test(file) ? "bootloader" : /partition/i.test(file) ? "partition-table" : "app";
  parts.push({ offset, file, label, sha256, size: data.length });
  console.log(`✓ ${file}${masterKey ? ".enc" : ""}  ${data.length} B  sha256 ${sha256.slice(0, 16)}…  → ${offset}`);
}

const snippet = {
  chipFamily,
  parts: parts.map(({ offset, file, label, sha256 }) => ({ offset, file, label, sha256 })),
  flashMode: "keep",
  flashFreq: "keep",
  flashSize: "keep",
  eraseAll: false,
};
console.log(`\nThêm build sau vào content/firmware/${id}.json (mảng "builds"), và đặt "demo": false:\n`);
console.log(JSON.stringify(snippet, null, 2));

#!/usr/bin/env node
/**
 * Copies real build artefacts into the firmware store and prints a manifest snippet.
 *
 * Usage:
 *   npm run firmware:add -- <firmware-id> <version> <chipFamily> <offset>=<path/to.bin> [<offset>=<path/to.bin> ...]
 * Example (ESP-IDF, ESP32-C6):
 *   npm run firmware:add -- matter-light-c6 1.2.0 ESP32-C6 \
 *     0x0=build/bootloader/bootloader.bin \
 *     0x8000=build/partition_table/partition-table.bin \
 *     0x10000=build/matter-light.bin
 *
 * Typical offsets: ESP32/ESP32-S2: bootloader 0x1000 · S3/C2/C3/C6/H2: bootloader 0x0 · partition table 0x8000 · app 0x10000.
 */
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const [id, version, chipFamily, ...pairs] = process.argv.slice(2);
if (!id || !version || !chipFamily || pairs.length === 0) {
  console.error("Cách dùng: npm run firmware:add -- <id> <version> <chipFamily> <offset>=<file.bin> [...]");
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error("id phải là slug: chữ thường, số, gạch ngang");
  process.exit(1);
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
  const offset = pair.slice(0, eq);
  const src = pair.slice(eq + 1);
  if (!/^(0x[0-9a-fA-F]+|\d+)$/.test(offset)) {
    console.error(`Offset không hợp lệ: ${offset}`);
    process.exit(1);
  }
  const file = path.basename(src).replace(/[^A-Za-z0-9._-]/g, "_");
  const data = await fs.readFile(src);
  await fs.writeFile(path.join(dir, file), data);
  const sha256 = createHash("sha256").update(data).digest("hex");
  const label = /boot/i.test(file) ? "bootloader" : /partition/i.test(file) ? "partition-table" : "app";
  parts.push({ offset, file, label, size: data.length, sha256 });
  console.log(`✓ ${file}  ${data.length} B  sha256 ${sha256.slice(0, 16)}…  → ${offset}`);
}

const snippet = {
  chipFamily,
  parts: parts.map(({ offset, file, label }) => ({ offset, file, label })),
  flashMode: "keep",
  flashFreq: "keep",
  flashSize: "keep",
  eraseAll: false,
  baudrate: 460800,
};
console.log(`\nThêm build sau vào content/firmware/${id}.json (mảng "builds"), và đặt "demo": false:\n`);
console.log(JSON.stringify(snippet, null, 2));

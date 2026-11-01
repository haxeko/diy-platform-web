/*
 * fake-esp-serial.js — browser-side emulation of an Espressif chip behind Web Serial.
 *
 * Injected with Playwright `page.addInitScript({ path })`. It replaces
 * `navigator.serial.requestPort()` / `getPorts()` with a fake `SerialPort` whose
 * other end is a virtual ESP32-C6 (or classic ESP32) running the ROM bootloader
 * and, once uploaded, the flasher stub — just enough of the esptool serial
 * protocol for esptool-js 0.7.0 to sync, identify the chip, upload the stub,
 * change baud rate, read the flash id, write compressed images, verify MD5 and
 * hard-reset.
 *
 * Configure before this script runs:
 *   window.__FAKE_ESP_OPTIONS__ = { chip: "esp32c6" | "esp32", flashSizeMB: 4, mac: "40:4c:ca:12:34:56", verbose: false }
 *
 * Inspect afterwards:
 *   window.__fakeEsp.flash          Uint8Array — virtual SPI flash (0xFF = erased)
 *   window.__fakeEsp.log            every command/response/signal/open/close, in order
 *   window.__fakeEsp.state          mode (rom|stub), baud rates, counters, sessions
 *   window.__fakeEsp.dump(off, len) base64 of a flash slice (cheap to ship to Node)
 *
 * Plain ES2020, no imports: it must run in the page before any app code.
 */
(function installFakeEsp() {
  "use strict";

  const opts = Object.assign(
    { chip: "esp32c6", flashSizeMB: 4, mac: "40:4c:ca:12:34:56", verbose: false, bootLog: true, maxLog: 20000 },
    globalThis.__FAKE_ESP_OPTIONS__ || {},
  );

  /* ------------------------------------------------------------------ */
  /* esptool serial protocol constants (see esptool-js lib/esploader.js) */
  /* ------------------------------------------------------------------ */
  const OP = {
    FLASH_BEGIN: 0x02,
    FLASH_DATA: 0x03,
    FLASH_END: 0x04,
    MEM_BEGIN: 0x05,
    MEM_END: 0x06,
    MEM_DATA: 0x07,
    SYNC: 0x08,
    WRITE_REG: 0x09,
    READ_REG: 0x0a,
    SPI_SET_PARAMS: 0x0b,
    SPI_ATTACH: 0x0d,
    CHANGE_BAUDRATE: 0x0f,
    FLASH_DEFL_BEGIN: 0x10,
    FLASH_DEFL_DATA: 0x11,
    FLASH_DEFL_END: 0x12,
    SPI_FLASH_MD5: 0x13,
    GET_SECURITY_INFO: 0x14,
    ERASE_FLASH: 0xd0,
    ERASE_REGION: 0xd1,
    READ_FLASH: 0xd2,
    RUN_USER_CODE: 0xd3,
  };
  const OP_NAME = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));

  // ROM error codes (status byte 2) and stub error codes.
  const ROM_ERR = { INVALID_MSG: 0x05, FAILED: 0x06, BAD_CRC: 0x07, FLASH_WRITE: 0x08, DEFLATE: 0x0b };
  const STUB_ERR = { BAD_DATA_LEN: 0xc0, BAD_DATA_CHECKSUM: 0xc1, BAD_BLOCKSIZE: 0xc2, INVALID_COMMAND: 0xc3, FAILED_SPI_OP: 0xc4, INFLATE: 0xc6, NOT_IN_FLASH_MODE: 0xc7, INFLATE_ERROR: 0xc8 };

  const SLIP_END = 0xc0, SLIP_ESC = 0xdb, SLIP_ESC_END = 0xdc, SLIP_ESC_ESC = 0xdd;
  const CHECKSUM_MAGIC = 0xef;
  const SECTOR = 0x1000;
  const SPI_CMD_USR = 1 << 18;
  const SPIFLASH_RDID = 0x9f;

  /* ------------------------------------------------------------------ */
  /* Chip profiles — register map modelled on esptool-js lib/targets/*   */
  /* ------------------------------------------------------------------ */
  const macBytes = String(opts.mac)
    .split(":")
    .map((h) => parseInt(h, 16) & 0xff);
  // esptool-js readMac(): mac1 = (reg1 & 0xffff) → mac[0..1]; mac0 = reg0 → mac[2..5]
  const MAC0 = ((macBytes[2] << 24) | (macBytes[3] << 16) | (macBytes[4] << 8) | macBytes[5]) >>> 0;
  const MAC1 = ((macBytes[0] << 8) | macBytes[1]) >>> 0;

  const PROFILES = {
    // lib/targets/esp32c6.js — native USB-Serial/JTAG (VID 0x303a / PID 0x1001)
    esp32c6: {
      name: "ESP32-C6",
      usb: { usbVendorId: 0x303a, usbProductId: 0x1001 },
      magic: 0x2ce0806f,
      securityInfo: { chipId: 13, apiVersion: 0 }, // IMAGE_CHIP_ID = 13 → GET_SECURITY_INFO supported
      spi: { base: 0x60003000, usr2: 0x20, w0: 0x58 },
      regs: {
        0x40001000: 0x2ce0806f, // CHIP_DETECT_MAGIC_REG_ADDR
        0x600b0844: MAC0, // EFUSE_BASE + 0x044 (BLOCK1 word 0) — MAC_EFUSE_REG
        0x600b0848: MAC1, // BLOCK1 word 1
        0x600b0850: 0x00000000, // BLOCK1 word 3: pkg_version (bits 21..23) = 0 → "ESP32-C6", revision (bits 18..20) = 0
      },
      bootLog:
        "ESP-ROM:esp32c6-20220919\r\nBuild:Sep 19 2022\r\nrst:0x15 (USB_UART_HPSYS),boot:0x6c (DOWNLOAD(USB/UART0))\r\nSaved PC:0x4001975a\r\nwaiting for download\r\n",
    },
    // lib/targets/esp32.js — classic ESP32 behind a CP2102 bridge (no GET_SECURITY_INFO, magic value only)
    esp32: {
      name: "ESP32",
      usb: { usbVendorId: 0x10c4, usbProductId: 0xea60 },
      magic: 0x00f01d83,
      securityInfo: null,
      spi: { base: 0x3ff42000, usr2: 0x24, w0: 0x80 },
      uartClkdivReg: 0x3ff40014,
      regs: {
        0x40001000: 0x00f01d83,
        0x3ff5a004: MAC0, // EFUSE_RD_REG_BASE + 4*1
        0x3ff5a008: MAC1, // EFUSE_RD_REG_BASE + 4*2
        0x3ff5a00c: 0x00008000, // efuse word 3: rev bit0 (bit 15) set, pkg 0 (D0WDQ6), dual core, BT enabled
        0x3ff5a010: 0x00000000, // efuse word 4
        0x3ff5a014: 0x00100000, // efuse word 5: rev bit1 (bit 20)
        0x3ff5a018: 0x00000000, // efuse word 6: coding scheme None
        0x3ff6607c: 0x80000000, // DR_REG_SYSCON_BASE + 0x7c: rev bit2 (bit 31) → revision 3
        0x3ff40014: 347, // UART_CLKDIV_REG: 40 MHz / 115200 ≈ 347 → getCrystalFreq() = 40
      },
      bootLog: "ets Jul 29 2019 12:21:46\r\n\r\nrst:0x1 (POWERON_RESET),boot:0x3 (DOWNLOAD_BOOT(UART0/UART1/SDIO_REI_REO_V2))\r\nwaiting for download\r\n",
    },
  };
  const profile = PROFILES[opts.chip];
  if (!profile) throw new Error(`fake-esp-serial: unknown chip profile "${opts.chip}"`);

  const FLASH_SIZE = opts.flashSizeMB * 1024 * 1024;
  // JEDEC id as esptool-js reads it: manufacturer in bits 0..7, device in 8..15, size id in 16..23
  const sizeId = 0x12 + Math.round(Math.log2(FLASH_SIZE / (256 * 1024))); // 0x16 for 4 MB
  const FLASH_ID = ((sizeId << 16) | (0x40 << 8) | 0xc8) >>> 0; // GigaDevice GD25Q, 4 MB → 0x1640c8

  /* ------------------------------------------------------------------ */
  /* small helpers                                                        */
  /* ------------------------------------------------------------------ */
  const u32 = (a, o) => (a[o] | (a[o + 1] << 8) | (a[o + 2] << 16) | (a[o + 3] << 24)) >>> 0;
  const le32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
  const hex = (n, w = 8) => "0x" + (n >>> 0).toString(16).padStart(w, "0");
  const concat = (chunks) => {
    const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  };
  function checksum(data) {
    let s = CHECKSUM_MAGIC;
    for (let i = 0; i < data.length; i++) s ^= data[i];
    return s >>> 0;
  }
  function slipEncode(data) {
    const out = [SLIP_END];
    for (const b of data) {
      if (b === SLIP_END) out.push(SLIP_ESC, SLIP_ESC_END);
      else if (b === SLIP_ESC) out.push(SLIP_ESC, SLIP_ESC_ESC);
      else out.push(b);
    }
    out.push(SLIP_END);
    return new Uint8Array(out);
  }
  function toHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  function b64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  /* MD5 (RFC 1321) over a Uint8Array → Uint8Array(16). Compact, little-endian word based. */
  function md5(input) {
    const K = new Int32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const len = input.length;
    const padLen = (((len + 8) >>> 6) + 1) << 6;
    const buf = new Uint8Array(padLen);
    buf.set(input);
    buf[len] = 0x80;
    const bits = len * 8;
    buf[padLen - 8] = bits & 0xff;
    buf[padLen - 7] = (bits >>> 8) & 0xff;
    buf[padLen - 6] = (bits >>> 16) & 0xff;
    buf[padLen - 5] = (bits >>> 24) & 0xff;
    buf[padLen - 4] = Math.floor(bits / 0x100000000) & 0xff;
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    const M = new Int32Array(16);
    const rotl = (x, c) => (x << c) | (x >>> (32 - c));
    for (let off = 0; off < padLen; off += 64) {
      for (let i = 0; i < 16; i++) M[i] = u32(buf, off + i * 4) | 0;
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
        else { F = C ^ (B | ~D); g = (7 * i) & 15; }
        const tmp = D;
        D = C;
        C = B;
        B = (B + rotl((A + F + K[i] + M[g]) | 0, S[((i >> 4) << 2) | (i & 3)])) | 0;
        A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    return new Uint8Array([...le32(a0), ...le32(b0), ...le32(c0), ...le32(d0)]);
  }

  /* zlib-wrapped deflate (what pako.deflate() produces) → bytes, via the Compression Streams API */
  async function inflateZlib(bytes) {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const pump = (async () => {
      await writer.write(bytes);
      await writer.close();
    })();
    const reader = ds.readable.getReader();
    const chunks = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    await pump;
    return concat(chunks);
  }

  /* ------------------------------------------------------------------ */
  /* The virtual chip                                                     */
  /* ------------------------------------------------------------------ */
  class FakeEsp {
    constructor() {
      this.flash = new Uint8Array(FLASH_SIZE).fill(0xff);
      this.regs = new Map(Object.entries(profile.regs).map(([k, v]) => [Number(k), v >>> 0]));
      this.log = [];
      this.counts = {};
      this.mode = "rom"; // "rom" (ROM bootloader) | "stub" (flasher stub running)
      this.deviceBaud = 115200;
      this.hostBaud = null;
      this.opened = false;
      this.openCount = 0;
      this.closeCount = 0;
      this.resetCount = 0;
      this.requestPortCount = 0;
      this.signals = { dataTerminalReady: false, requestToSend: false, break: false };
      this.lastGoodOp = OP.SYNC;
      this.mem = null; // RAM download session (stub upload)
      this.fsess = null; // flash write session
      this.flashWrites = []; // { offset, size, compressed, md5 } per completed image
      this.md5Checks = []; // { addr, size, md5 } per SPI_FLASH_MD5 request
      this.errors = [];
      this.port = null;
      this._rc = null; // ReadableStream controller of the current `readable`
      this._slip = { inFrame: false, esc: false, buf: [] };
      this._queue = Promise.resolve();
    }

    /* ---- logging ---- */
    note(entry) {
      if (this.log.length < opts.maxLog) this.log.push(Object.assign({ t: Math.round(performance.now()) }, entry));
      if (opts.verbose) console.debug("[fakeEsp]", JSON.stringify(entry));
    }
    fail(msg, extra) {
      this.errors.push(Object.assign({ msg }, extra || {}));
      this.note(Object.assign({ ev: "error", msg }, extra || {}));
    }

    /* ---- bytes towards the host ---- */
    toHost(bytes) {
      if (!this._rc) {
        this.note({ ev: "drop", reason: "readable not available", len: bytes.length });
        return;
      }
      try {
        this._rc.enqueue(new Uint8Array(bytes));
      } catch (e) {
        this.note({ ev: "drop", reason: String(e), len: bytes.length });
      }
    }
    statusBytes(status, err) {
      return this.mode === "rom" ? [status, err, 0, 0] : [status, err];
    }
    respond(op, val, payload, status = 0, err = 0) {
      const data = [...(payload || []), ...this.statusBytes(status, err)];
      const pkt = new Uint8Array([0x01, op, data.length & 0xff, (data.length >>> 8) & 0xff, ...le32(val >>> 0), ...data]);
      this.note({ dir: "<-", op, name: OP_NAME[op] || hex(op, 2), val: hex(val >>> 0), status, err, len: data.length });
      this.toHost(slipEncode(pkt));
    }
    /* ROM reaction to an op it does not know: 8 copies of an error response under a *different* op (see esploader.js readPacket) */
    respondUnsupported(op) {
      const echoOp = this.lastGoodOp === op ? 0x00 : this.lastGoodOp;
      const data = [1, ROM_ERR.INVALID_MSG, 0, 0];
      const pkt = slipEncode(new Uint8Array([0x01, echoOp, 4, 0, 0, 0, 0, 0, ...data]));
      this.note({ dir: "<-", op, name: OP_NAME[op] || hex(op, 2), unsupported: true, echoOp });
      this.toHost(concat(Array(8).fill(pkt)));
    }

    /* ---- reset / signals ---- */
    setSignals(s) {
      const before = Object.assign({}, this.signals);
      for (const k of ["dataTerminalReady", "requestToSend", "break"]) if (typeof s[k] === "boolean") this.signals[k] = s[k];
      this.note({ ev: "setSignals", arg: s, now: Object.assign({}, this.signals) });
      // RTS true → false: EN released after being held low → the chip (re)boots. Both reset
      // strategies esptool-js uses end this way, and both land in download mode.
      if (before.requestToSend && !this.signals.requestToSend) this.resetChip("rts-edge");
    }
    resetChip(reason) {
      this.resetCount++;
      this.mode = "rom";
      this.deviceBaud = 115200;
      this.mem = null;
      this.fsess = null;
      this.lastGoodOp = OP.SYNC;
      this._slip = { inFrame: false, esc: false, buf: [] };
      this.note({ ev: "reset", reason, mode: "rom" });
      if (opts.bootLog && this.opened) this.toHost(new TextEncoder().encode(profile.bootLog));
    }

    /* ---- bytes from the host ---- */
    onHostBytes(chunk) {
      const st = this._slip;
      for (const b of chunk) {
        if (!st.inFrame) {
          if (b === SLIP_END) st.inFrame = true;
          continue; // noise between frames is ignored, like a UART would
        }
        if (st.esc) {
          st.esc = false;
          if (b === SLIP_ESC_END) st.buf.push(SLIP_END);
          else if (b === SLIP_ESC_ESC) st.buf.push(SLIP_ESC);
          else st.buf.push(b);
        } else if (b === SLIP_ESC) {
          st.esc = true;
        } else if (b === SLIP_END) {
          if (st.buf.length) {
            const frame = new Uint8Array(st.buf);
            st.buf = [];
            this._queue = this._queue.then(() => this.handleFrame(frame)).catch((e) => this.fail(`handler threw: ${e && e.stack ? e.stack : e}`));
          }
          st.inFrame = true; // back-to-back frames share the END byte
        } else {
          st.buf.push(b);
        }
      }
    }

    async handleFrame(frame) {
      if (frame.length < 8 || frame[0] !== 0x00) {
        this.fail("malformed command frame", { len: frame.length, head: toHex(frame.subarray(0, 8)) });
        return;
      }
      const op = frame[1];
      const size = frame[2] | (frame[3] << 8);
      const chk = u32(frame, 4);
      const data = frame.subarray(8, 8 + size);
      if (data.length !== size) this.fail("frame size mismatch", { op, size, got: data.length });
      this.counts[OP_NAME[op] || hex(op, 2)] = (this.counts[OP_NAME[op] || hex(op, 2)] || 0) + 1;
      const entry = { dir: "->", op, name: OP_NAME[op] || hex(op, 2), size, mode: this.mode };

      switch (op) {
        case OP.SYNC: {
          const ok = data[0] === 0x07 && data[1] === 0x07 && data[2] === 0x12 && data[3] === 0x20;
          this.note(Object.assign(entry, { ok }));
          if (!ok) return;
          if (this.mode === "rom") for (let i = 0; i < 8; i++) this.respond(op, 0x80); // ROM answers 8×, non-zero value
          else this.respond(op, 0); // stub answers once with 0
          break;
        }
        case OP.READ_REG: {
          const addr = u32(data, 0);
          const val = this.regs.has(addr) ? this.regs.get(addr) : 0;
          this.note(Object.assign(entry, { addr: hex(addr), val: hex(val), known: this.regs.has(addr) }));
          this.respond(op, val);
          break;
        }
        case OP.WRITE_REG: {
          const writes = [];
          for (let o = 0; o + 16 <= data.length; o += 16) {
            const addr = u32(data, o), value = u32(data, o + 4), mask = u32(data, o + 8), delay = u32(data, o + 12);
            const cur = this.regs.has(addr) ? this.regs.get(addr) : 0;
            const next = ((cur & ~mask) | (value & mask)) >>> 0;
            this.regs.set(addr, next);
            writes.push({ addr: hex(addr), value: hex(value), mask: hex(mask), delay });
            this.spiHook(addr);
          }
          this.note(Object.assign(entry, { writes }));
          this.respond(op, 0);
          break;
        }
        case OP.GET_SECURITY_INFO: {
          if (this.mode === "rom" && !profile.securityInfo) {
            this.note(Object.assign(entry, { supported: false }));
            this.respondUnsupported(op);
            return;
          }
          const si = profile.securityInfo || { chipId: 0, apiVersion: 0 };
          // flags(4) flash_crypt_cnt(1) key_purposes(7) chip_id(4) api_version(4)
          const payload = [...le32(0), 0, 0, 0, 0, 0, 0, 0, 0, ...le32(si.chipId), ...le32(si.apiVersion)];
          this.note(Object.assign(entry, { chipId: si.chipId }));
          this.respond(op, 0, payload);
          break;
        }
        case OP.MEM_BEGIN: {
          const [sz, blocks, blocksize, offset] = [u32(data, 0), u32(data, 4), u32(data, 8), u32(data, 12)];
          this.mem = { size: sz, blocks, blocksize, offset, received: 0, bytes: 0 };
          this.note(Object.assign(entry, { size: sz, blocks, blocksize, offset: hex(offset) }));
          this.respond(op, 0);
          break;
        }
        case OP.MEM_DATA: {
          const len = u32(data, 0), seq = u32(data, 4);
          const body = data.subarray(16, 16 + len);
          const calc = checksum(body);
          const ok = this.mem && body.length === len && calc === chk;
          this.note(Object.assign(entry, { len, seq, chkOk: calc === chk }));
          if (!ok) {
            this.fail("MEM_DATA rejected", { len, seq, got: body.length, chk: hex(chk), calc: hex(calc) });
            this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.BAD_CRC : STUB_ERR.BAD_DATA_CHECKSUM);
            return;
          }
          this.mem.received++;
          this.mem.bytes += len;
          this.respond(op, 0);
          break;
        }
        case OP.MEM_END: {
          const noEntry = u32(data, 0), entry_ = u32(data, 4);
          this.note(Object.assign(entry, { noEntry, entry: hex(entry_), uploaded: this.mem }));
          this.respond(op, 0);
          if (!noEntry && entry_ !== 0 && this.mode === "rom") {
            // The flasher stub starts and greets the host.
            this.mode = "stub";
            this.mem = null;
            this.note({ ev: "stub-start", entry: hex(entry_) });
            this.toHost(slipEncode(new TextEncoder().encode("OHAI")));
          }
          break;
        }
        case OP.CHANGE_BAUDRATE: {
          const baud = u32(data, 0), old = u32(data, 4);
          this.note(Object.assign(entry, { baud, old }));
          this.respond(op, 0); // acknowledged at the old baud rate…
          this.deviceBaud = baud; // …then the UART switches
          if (profile.uartClkdivReg) this.regs.set(profile.uartClkdivReg, Math.round(40e6 / baud)); // classic ESP32 getCrystalFreq() reads this
          break;
        }
        case OP.SPI_ATTACH:
        case OP.SPI_SET_PARAMS: {
          this.note(Object.assign(entry, { args: Array.from({ length: data.length >> 2 }, (_, i) => hex(u32(data, i * 4))) }));
          this.respond(op, 0);
          break;
        }
        case OP.FLASH_BEGIN:
        case OP.FLASH_DEFL_BEGIN: {
          const compressed = op === OP.FLASH_DEFL_BEGIN;
          const [writeSize, numBlocks, blockSize, offset] = [u32(data, 0), u32(data, 4), u32(data, 8), u32(data, 12)];
          if (offset + writeSize > FLASH_SIZE) {
            this.fail("flash begin out of range", { offset: hex(offset), writeSize });
            this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.FAILED : STUB_ERR.BAD_BLOCKSIZE);
            return;
          }
          const eraseEnd = Math.min(FLASH_SIZE, Math.ceil((offset + writeSize) / SECTOR) * SECTOR);
          this.flash.fill(0xff, offset, eraseEnd);
          this.fsess = { compressed, offset, writeSize, numBlocks, blockSize, received: 0, chunks: [], written: 0, done: false };
          this.note(Object.assign(entry, { compressed, writeSize, numBlocks, blockSize, offset: hex(offset), erased: [hex(offset), hex(eraseEnd)] }));
          this.respond(op, 0);
          break;
        }
        case OP.FLASH_DATA:
        case OP.FLASH_DEFL_DATA: {
          const s = this.fsess;
          const len = u32(data, 0), seq = u32(data, 4);
          const body = data.subarray(16, 16 + len);
          const calc = checksum(body);
          const wantCompressed = op === OP.FLASH_DEFL_DATA;
          if (!s || s.compressed !== wantCompressed) {
            this.fail("flash data without matching begin", { op });
            this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.FAILED : STUB_ERR.NOT_IN_FLASH_MODE);
            return;
          }
          if (body.length !== len || calc !== chk) {
            this.fail("flash data rejected", { seq, len, got: body.length, chk: hex(chk), calc: hex(calc) });
            this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.BAD_CRC : STUB_ERR.BAD_DATA_CHECKSUM);
            return;
          }
          s.received++;
          if (!s.compressed) {
            // esptool pads the last block to blockSize with 0xFF, so block seq lands at offset + seq*blockSize.
            const dst = s.offset + seq * s.blockSize;
            const n = Math.min(body.length, s.offset + s.writeSize - dst);
            if (n > 0) this.flash.set(body.subarray(0, n), dst);
            s.written += Math.max(0, n);
            this.note(Object.assign(entry, { seq, len, dst: hex(dst) }));
          } else {
            s.chunks.push(new Uint8Array(body));
            this.note(Object.assign(entry, { seq, len, received: s.received, of: s.numBlocks }));
            if (s.received >= s.numBlocks) {
              const err = await this.finishDeflate(s);
              if (err) {
                this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.DEFLATE : STUB_ERR.INFLATE_ERROR);
                return;
              }
            }
          }
          this.respond(op, 0);
          break;
        }
        case OP.FLASH_END:
        case OP.FLASH_DEFL_END: {
          const reboot = u32(data, 0) === 0;
          const s = this.fsess;
          if (s && s.compressed && !s.done) {
            const err = await this.finishDeflate(s);
            if (err) {
              this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.DEFLATE : STUB_ERR.INFLATE_ERROR);
              return;
            }
          }
          if (s && !s.compressed) {
            s.done = true;
            this.flashWrites.push({ offset: s.offset, size: s.writeSize, compressed: false });
          }
          this.note(Object.assign(entry, { reboot, session: s && { offset: hex(s.offset), writeSize: s.writeSize, received: s.received } }));
          this.fsess = null;
          this.respond(op, 0);
          if (reboot) this.resetChip("flash-end-reboot");
          break;
        }
        case OP.SPI_FLASH_MD5: {
          const addr = u32(data, 0), size = u32(data, 4);
          if (addr + size > FLASH_SIZE) {
            this.fail("md5 out of range", { addr: hex(addr), size });
            this.respond(op, 0, [], 1, this.mode === "rom" ? ROM_ERR.FAILED : STUB_ERR.BAD_DATA_LEN);
            return;
          }
          const digest = md5(this.flash.subarray(addr, addr + size));
          const hexd = toHex(digest);
          this.md5Checks.push({ addr, size, md5: hexd });
          this.note(Object.assign(entry, { addr: hex(addr), size, md5: hexd }));
          // stub: 16 raw bytes; ROM: 32 hex ASCII bytes
          this.respond(op, 0, this.mode === "stub" ? Array.from(digest) : Array.from(new TextEncoder().encode(hexd)));
          break;
        }
        case OP.ERASE_FLASH: {
          if (this.mode !== "stub") return this.unsupported(op, entry);
          this.flash.fill(0xff);
          this.note(Object.assign(entry, { erased: "all" }));
          this.respond(op, 0);
          break;
        }
        case OP.ERASE_REGION: {
          if (this.mode !== "stub") return this.unsupported(op, entry);
          const offset = u32(data, 0), size = u32(data, 4);
          this.flash.fill(0xff, offset, Math.min(FLASH_SIZE, offset + size));
          this.note(Object.assign(entry, { offset: hex(offset), size }));
          this.respond(op, 0);
          break;
        }
        case OP.RUN_USER_CODE: {
          this.note(entry);
          this.resetChip("run-user-code"); // no response, chip reboots into the application
          break;
        }
        default:
          return this.unsupported(op, entry);
      }
      this.lastGoodOp = op;
    }

    unsupported(op, entry) {
      this.note(Object.assign(entry, { supported: false }));
      if (this.mode === "rom") this.respondUnsupported(op);
      else this.respond(op, 0, [], 1, STUB_ERR.INVALID_COMMAND);
    }

    async finishDeflate(s) {
      try {
        const plain = await inflateZlib(concat(s.chunks));
        if (plain.length !== s.writeSize) this.note({ ev: "inflate-size", got: plain.length, expected: s.writeSize });
        const n = Math.min(plain.length, FLASH_SIZE - s.offset);
        this.flash.set(plain.subarray(0, n), s.offset);
        s.written = n;
        s.done = true;
        this.flashWrites.push({ offset: s.offset, size: n, compressed: true, compressedSize: s.chunks.reduce((a, c) => a + c.length, 0), md5: toHex(md5(plain)) });
        this.note({ ev: "inflate", offset: hex(s.offset), size: n });
        return null;
      } catch (e) {
        this.fail(`inflate failed: ${e}`);
        return e;
      }
    }

    /* SPI_CMD_REG write with SPI_CMD_USR → "execute" the user command held in SPI_USR2 (low byte). */
    spiHook(addr) {
      const { base, usr2, w0 } = profile.spi;
      if (addr !== base) return;
      const cmd = this.regs.get(base) >>> 0;
      if (!(cmd & SPI_CMD_USR)) return;
      const spiCmd = (this.regs.get(base + usr2) || 0) & 0xff;
      const result = spiCmd === SPIFLASH_RDID ? FLASH_ID : 0;
      this.regs.set(base + w0, result >>> 0);
      this.regs.set(base, (cmd & ~SPI_CMD_USR) >>> 0); // command complete
      this.note({ ev: "spi-cmd", cmd: hex(spiCmd, 2), result: hex(result) });
    }

    get state() {
      return {
        chip: profile.name,
        mode: this.mode,
        opened: this.opened,
        hostBaud: this.hostBaud,
        deviceBaud: this.deviceBaud,
        openCount: this.openCount,
        closeCount: this.closeCount,
        resetCount: this.resetCount,
        requestPortCount: this.requestPortCount,
        signals: Object.assign({}, this.signals),
        counts: Object.assign({}, this.counts),
        flashWrites: this.flashWrites.slice(),
        md5Checks: this.md5Checks.slice(),
        errors: this.errors.slice(),
        flashSize: FLASH_SIZE,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Web Serial surface                                                   */
  /* ------------------------------------------------------------------ */
  const dev = new FakeEsp();

  function domException(message, name) {
    try {
      return new DOMException(message, name);
    } catch {
      const e = new Error(message);
      e.name = name;
      return e;
    }
  }

  class FakeSerialPort extends EventTarget {
    constructor() {
      super();
      this.readable = null;
      this.writable = null;
      this.onconnect = null;
      this.ondisconnect = null;
    }
    get connected() {
      return true;
    }
    getInfo() {
      return Object.assign({}, profile.usb);
    }
    async open(options) {
      if (dev.opened) {
        dev.note({ ev: "open-rejected", error: "InvalidStateError: The port is already open." });
        throw domException("Failed to execute 'open' on 'SerialPort': The port is already open.", "InvalidStateError");
      }
      if (!options || !Number.isInteger(options.baudRate) || options.baudRate <= 0) {
        throw new TypeError("Failed to execute 'open' on 'SerialPort': required member baudRate is undefined.");
      }
      dev.opened = true;
      dev.openCount++;
      dev.hostBaud = options.baudRate;
      dev._slip = { inFrame: false, esc: false, buf: [] };
      this.readable = new ReadableStream({
        start: (controller) => {
          dev._rc = controller;
        },
        cancel: () => {
          dev._rc = null;
        },
      });
      this.writable = new WritableStream({
        write: (chunk) => {
          dev.onHostBytes(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        },
      });
      dev.note({ ev: "open", baudRate: options.baudRate, deviceBaud: dev.deviceBaud, mode: dev.mode });
    }
    async close() {
      if (!dev.opened) throw domException("Failed to execute 'close' on 'SerialPort': The port is already closed.", "InvalidStateError");
      if ((this.readable && this.readable.locked) || (this.writable && this.writable.locked)) {
        throw domException("Failed to execute 'close' on 'SerialPort': Cannot cancel a locked stream.", "InvalidStateError");
      }
      try {
        if (dev._rc) dev._rc.close();
      } catch {
        /* already closed by reader.cancel() */
      }
      dev._rc = null;
      this.readable = null;
      this.writable = null;
      dev.opened = false;
      dev.closeCount++;
      dev.note({ ev: "close", mode: dev.mode });
    }
    async setSignals(signals) {
      if (!dev.opened) throw domException("Failed to execute 'setSignals' on 'SerialPort': The port is not open.", "InvalidStateError");
      dev.setSignals(signals || {});
    }
    async getSignals() {
      if (!dev.opened) throw domException("Failed to execute 'getSignals' on 'SerialPort': The port is not open.", "InvalidStateError");
      return { dataCarrierDetect: false, clearToSend: true, ringIndicator: false, dataSetReady: true };
    }
    async forget() {}
  }

  const port = new FakeSerialPort();
  dev.port = port;

  const fakeSerial = new EventTarget();
  Object.assign(fakeSerial, {
    onconnect: null,
    ondisconnect: null,
    requestPort: async (options) => {
      dev.requestPortCount++;
      dev.note({ ev: "requestPort", options: options || null });
      return port;
    },
    getPorts: async () => [port],
  });
  Object.defineProperty(navigator, "serial", { value: fakeSerial, configurable: true, enumerable: true, writable: false });

  Object.defineProperty(globalThis, "__fakeEsp", {
    configurable: true,
    enumerable: false,
    value: {
      options: opts,
      profile: { name: profile.name, usb: profile.usb, magic: profile.magic },
      flash: dev.flash,
      log: dev.log,
      port,
      device: dev,
      get state() {
        return dev.state;
      },
      dump: (offset, length) => b64(dev.flash.subarray(offset, offset + length)),
      md5: (offset, length) => toHex(md5(dev.flash.subarray(offset, offset + length))),
    },
  });

  dev.note({ ev: "installed", chip: profile.name, flashSize: FLASH_SIZE, mac: opts.mac });
})();

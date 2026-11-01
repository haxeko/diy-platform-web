/**
 * In-browser flashing engine built on esptool-js (Web Serial).
 *
 * Two explicit steps, like ESP Web Tools:
 *   connect()  → request port → ROM bootloader → chip detection → compatibility checks → "detected"
 *   flash()    → signed session → encrypted parts → in-memory decrypt → writeFlash (+MD5) → hard reset → "done"
 * plus an optional serial monitor after flashing that surfaces the Matter pairing code.
 *
 * Firmware bytes only ever live in local variables inside this class and are
 * zeroed after flashing. They are never written to disk, a Blob URL or React state.
 */
import type { ESPLoader as ESPLoaderType, Transport as TransportType } from "esptool-js";
import type { ChipFamily } from "@/lib/content/schema";
import {
  PART_IV_BYTES,
  PART_TAG_BYTES,
  findBuildForChip,
  flashSizeToBytes,
  partAad,
  type FirmwarePublic,
  type FlashApiError,
  type FlashSessionRequest,
  type FlashSessionResponse,
} from "../shared";
import { FlashError, toFlashError } from "./errors";

export type FlashPhase =
  | "idle"
  | "requesting-port"
  | "connecting"
  | "detecting"
  | "detected"
  | "incompatible"
  | "preparing"
  | "erasing"
  | "flashing"
  | "finishing"
  | "done"
  | "error";

export interface ChipInfo {
  /** Chip family as esptool-js reports it, e.g. "ESP32-C6". */
  chip: string;
  /** Detailed description, e.g. "ESP32-C6 (QFN40) (revision v0.1)". */
  description?: string;
  features?: string[];
  mac?: string;
  flashSize?: string;
  flashBytes?: number;
  crystalMHz?: number;
  usbJtagSerial?: boolean;
  vid?: number;
  pid?: number;
}

export interface FlashProgress {
  partIndex: number;
  partCount: number;
  /** 0..1 for the current part */
  part: number;
  /** 0..1 overall, weighted by plaintext size */
  overall: number;
  bytesWritten: number;
  bytesTotal: number;
}

export interface PrepareProgress {
  received: number;
  total: number;
}

export interface PairingInfo {
  qr?: string;
  manualCode?: string;
}

export interface FlashEngineEvents {
  onPhase?: (phase: FlashPhase) => void;
  onLog?: (line: string) => void;
  onChip?: (info: ChipInfo) => void;
  onPrepare?: (p: PrepareProgress) => void;
  onProgress?: (p: FlashProgress) => void;
  onIncompatible?: (detected: string, supported: ChipFamily[], reason: "chip" | "flash-too-small") => void;
  onDone?: (summary: { chip: ChipInfo; firmware: FlashSessionResponse["firmware"]; seconds: number; bytes: number }) => void;
  onError?: (err: FlashError) => void;
  onMonitor?: (state: "open" | "closed") => void;
  onMonitorLine?: (line: string) => void;
  onPairing?: (info: PairingInfo) => void;
}

export interface FlashEngineOptions {
  firmware: FirmwarePublic;
  events?: FlashEngineEvents;
  /** Override the build's baud rate (e.g. 230400 for flaky USB-UART bridges). */
  baudrate?: number;
  /** Milliseconds allowed for connect + chip detection. */
  connectTimeoutMs?: number;
}

export interface FlashRunOptions {
  /** Erase the whole flash first ("Cài mới"). */
  eraseAll: boolean;
}

const BUSY: ReadonlySet<FlashPhase> = new Set(["requesting-port", "connecting", "detecting", "preparing", "erasing", "flashing", "finishing"]);
const MONITOR_BAUD = 115200;
const MAX_MONITOR_LINE = 512;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator && typeof window !== "undefined" && window.isSecureContext;
}

export function isBusyPhase(p: FlashPhase): boolean {
  return BUSY.has(p);
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => FlashError): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(onTimeout()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export class FlashEngine {
  private readonly fw: FirmwarePublic;
  private readonly ev: FlashEngineEvents;
  private readonly baudOverride?: number;
  private readonly connectTimeoutMs: number;

  private transport: TransportType | null = null;
  private loader: ESPLoaderType | null = null;
  private port: SerialPort | null = null;
  private info: ChipInfo | null = null;
  private aborted = false;
  private phase: FlashPhase = "idle";
  private monitorOpen = false;
  private monitorStop = false;

  constructor(opts: FlashEngineOptions) {
    this.fw = opts.firmware;
    this.ev = opts.events ?? {};
    this.baudOverride = opts.baudrate;
    this.connectTimeoutMs = opts.connectTimeoutMs ?? 45_000;
  }

  get currentPhase(): FlashPhase {
    return this.phase;
  }

  get chipInfo(): ChipInfo | null {
    return this.info;
  }

  private setPhase(p: FlashPhase) {
    this.phase = p;
    this.ev.onPhase?.(p);
  }

  private log(line: string) {
    this.ev.onLog?.(line);
  }

  private checkAborted() {
    if (this.aborted) throw new FlashError("aborted");
  }

  /* ------------------------------------------------------------------ */
  /*  Step 1: connect + detect                                           */
  /* ------------------------------------------------------------------ */

  async connect(): Promise<void> {
    if (BUSY.has(this.phase) || this.phase === "detected") return;
    this.aborted = false;
    this.info = null;

    try {
      if (!isWebSerialSupported()) throw new FlashError("unsupported-browser");

      this.setPhase("requesting-port");
      try {
        this.port = await navigator.serial.requestPort({});
      } catch (err) {
        throw toFlashError(err, "no-port-selected");
      }
      this.checkAborted();

      this.setPhase("connecting");
      const esptool = await import("esptool-js");
      const transport = new esptool.Transport(this.port, false);
      this.transport = transport;

      const terminal = {
        clean: () => {},
        writeLine: (data: string) => this.log(data),
        write: (data: string) => this.log(data),
      };

      const tryConnect = async (baudrate: number) => {
        const loader = new esptool.ESPLoader({ transport, baudrate, romBaudrate: 115200, terminal, debugLogging: false });
        this.loader = loader;
        await withTimeout(loader.main(), this.connectTimeoutMs, () => new FlashError("connect-failed"));
        return loader;
      };

      const wanted = this.baudOverride ?? 460800;
      let loader: ESPLoaderType;
      try {
        loader = await tryConnect(wanted);
      } catch (err) {
        const fe = toFlashError(err, "connect-failed");
        // One automatic retry at the ROM baud rate: many CH340 clones choke on fast baud switches.
        if (fe.code === "connect-failed" && wanted !== 115200 && !this.aborted) {
          this.log(`Không kết nối được ở ${wanted} baud, thử lại ở 115200…`);
          try {
            await transport.disconnect();
          } catch {
            /* ignore */
          }
          loader = await tryConnect(115200);
        } else {
          throw fe;
        }
      }
      this.checkAborted();

      this.setPhase("detecting");
      const info = await this.collectChipInfo(loader);
      this.info = info;
      this.ev.onChip?.(info);

      /* compatibility: build for this chip family? */
      const build = findBuildForChip(this.fw.chips.map((c) => ({ chipFamily: c })), info.chip);
      if (!build) {
        this.log(`Không có bản dựng cho ${info.chip}. Firmware hỗ trợ: ${this.fw.chips.join(", ")}.`);
        await this.safeReset(loader);
        await this.cleanup();
        this.setPhase("incompatible");
        this.ev.onIncompatible?.(info.chip, this.fw.chips, "chip");
        return;
      }

      /* compatibility: declared minimum flash size */
      if (this.fw.minFlashMB && info.flashBytes && info.flashBytes < this.fw.minFlashMB * 1024 * 1024) {
        this.log(`Flash phát hiện ${info.flashSize} nhỏ hơn yêu cầu ${this.fw.minFlashMB}MB.`);
        await this.safeReset(loader);
        await this.cleanup();
        this.setPhase("incompatible");
        this.ev.onIncompatible?.(info.chip, this.fw.chips, "flash-too-small");
        return;
      }

      this.setPhase("detected");
    } catch (err) {
      const fe = this.aborted ? new FlashError("aborted") : toFlashError(err);
      await this.cleanup();
      this.setPhase("error");
      this.ev.onError?.(fe);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Step 2: flash                                                      */
  /* ------------------------------------------------------------------ */

  async flash(opts: FlashRunOptions): Promise<void> {
    const loader = this.loader;
    const info = this.info;
    if (this.phase !== "detected" || !loader || !info) return;
    this.aborted = false;
    const startedAt = performance.now();
    const images: Uint8Array<ArrayBuffer>[] = [];
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    try {
      this.setPhase("preparing");
      window.addEventListener("beforeunload", guard);

      let session = await this.openSession({ firmwareId: this.fw.id, chip: info.chip });
      let key = await importKey(session.key);
      let nonce = tokenNonce(session.token);
      this.checkAborted();

      /* flash capacity check against the real image layout */
      const end = Math.max(...session.build.parts.map((p) => p.offset + p.size));
      if (info.flashBytes && end > info.flashBytes) {
        throw new FlashError("flash-too-small", undefined, `Firmware cần ${formatBytes(end)} nhưng board chỉ có ${info.flashSize}.`);
      }

      const totalBytes = session.build.parts.reduce((s, p) => s + p.size, 0);
      let received = 0;
      this.ev.onPrepare?.({ received, total: totalBytes });

      for (let i = 0; i < session.build.parts.length; i++) {
        this.checkAborted();
        const part = session.build.parts[i];
        let wire: Uint8Array<ArrayBuffer>;
        try {
          wire = await this.fetchPart(session.token, part.index);
        } catch (err) {
          // Expired/consumed session (e.g. a retried request): open a fresh session once and continue.
          if (err instanceof FlashError && err.code === "session-expired") {
            this.log("Phiên hết hạn, đang xin phiên mới…");
            session = await this.openSession({ firmwareId: this.fw.id, chip: info.chip });
            key = await importKey(session.key);
            nonce = tokenNonce(session.token);
            wire = await this.fetchPart(session.token, part.index);
          } else {
            throw err;
          }
        }
        const plain = await this.decryptPart(key, nonce, part.index, wire);
        if (plain.byteLength !== part.size) throw new FlashError("decrypt-failed", undefined, "Kích thước không khớp — tải lại trang và thử lại.");
        images.push(plain);
        received += plain.byteLength;
        this.ev.onPrepare?.({ received, total: totalBytes });
        this.log(`Đã nhận phần ${part.index + 1}/${session.build.parts.length} (${formatBytes(part.size)}) → 0x${part.offset.toString(16)}`);
      }

      const { md5 } = await import("js-md5");
      const sizes = session.build.parts.map((p) => p.size);
      const grandTotal = sizes.reduce((a, b) => a + b, 0);
      const doneBefore = sizes.map((_, i) => sizes.slice(0, i).reduce((a, b) => a + b, 0));

      const eraseAll = opts.eraseAll || session.build.eraseAll;
      this.setPhase(eraseAll ? "erasing" : "flashing");
      if (eraseAll) this.log("Đang xoá toàn bộ flash…");

      // esptool-js reports progress against the (compressed) bytes of the current image;
      // we convert that to an overall fraction weighted by plaintext size.
      const reportProgress = (fileIndex: number, written: number, total: number) => {
        if (this.phase === "erasing") this.setPhase("flashing");
        const frac = total > 0 ? Math.min(1, written / total) : 1;
        const bytesWritten = doneBefore[fileIndex] + frac * sizes[fileIndex];
        this.ev.onProgress?.({
          partIndex: fileIndex,
          partCount: sizes.length,
          part: frac,
          overall: grandTotal > 0 ? bytesWritten / grandTotal : 1,
          bytesWritten: Math.round(bytesWritten),
          bytesTotal: grandTotal,
        });
      };

      try {
        await loader.writeFlash({
          fileArray: session.build.parts.map((p, i) => ({ data: images[i], address: p.offset })),
          flashMode: session.build.flashMode,
          flashFreq: session.build.flashFreq,
          flashSize: session.build.flashSize,
          eraseAll,
          compress: true,
          reportProgress,
          calculateMD5Hash: (image: Uint8Array) => md5(image),
        });
      } catch (err) {
        if (this.aborted) throw new FlashError("aborted");
        throw toFlashError(err, "flash-failed");
      }

      this.setPhase("finishing");
      await this.safeReset(loader);
      await this.cleanup(/* keepPort */ true);

      this.setPhase("done");
      this.ev.onDone?.({
        chip: info,
        firmware: session.firmware,
        seconds: Math.max(1, Math.round((performance.now() - startedAt) / 1000)),
        bytes: grandTotal,
      });
    } catch (err) {
      const fe = this.aborted ? new FlashError("aborted") : toFlashError(err);
      await this.cleanup();
      this.setPhase("error");
      this.ev.onError?.(fe);
    } finally {
      window.removeEventListener("beforeunload", guard);
      for (const img of images) img.fill(0);
      images.length = 0;
    }
  }

  /** Leaves the "detected" state without flashing (resets the board back into its app). */
  async disconnect(): Promise<void> {
    if (this.loader && this.phase === "detected") await this.safeReset(this.loader);
    await this.stopMonitor();
    await this.cleanup();
    this.info = null;
    this.setPhase("idle");
  }

  /**
   * Cancels an in-flight step. Safe to call at any time. While a step is running the
   * step's own catch block reports "aborted"; from the idle "detected" state we do it here.
   */
  async abort(): Promise<void> {
    this.aborted = true;
    const wasDetected = this.phase === "detected";
    await this.stopMonitor();
    await this.cleanup();
    if (wasDetected) {
      this.setPhase("error");
      this.ev.onError?.(new FlashError("aborted"));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Serial monitor (after "done")                                      */
  /* ------------------------------------------------------------------ */

  async startMonitor(): Promise<void> {
    if (this.monitorOpen || !this.port) return;
    const esptool = await import("esptool-js");
    const transport = new esptool.Transport(this.port, false);
    this.transport = transport;
    this.monitorStop = false;
    this.monitorOpen = true;
    this.ev.onMonitor?.("open");
    try {
      await transport.connect(MONITOR_BAUD);
      // Reset the board so we catch the boot log (where the Matter pairing code is printed).
      await this.safeReset(null);
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let buffer = "";
      let found: PairingInfo = {};
      const onData = (data: Uint8Array) => {
        buffer += decoder.decode(data, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "").replace(/\x1b\[[0-9;]*m/g, "");
          buffer = buffer.slice(nl + 1);
          if (!line.trim()) continue;
          this.ev.onMonitorLine?.(line.length > MAX_MONITOR_LINE ? `${line.slice(0, MAX_MONITOR_LINE)}…` : line);
          const qr = /MT:[A-Z0-9.\-]{15,}/.exec(line)?.[0];
          const manual = /manual pairing code:?\s*\[?(\d{11}|\d{21})/i.exec(line)?.[1];
          if ((qr && qr !== found.qr) || (manual && manual !== found.manualCode)) {
            found = { qr: qr ?? found.qr, manualCode: manual ?? found.manualCode };
            this.ev.onPairing?.(found);
          }
        }
        if (buffer.length > 4096) buffer = buffer.slice(-2048);
      };
      await transport.rawRead(onData, () => this.monitorStop);
    } catch (err) {
      if (!this.monitorStop) this.log(`Serial Monitor: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.monitorOpen = false;
      this.monitorStop = true;
      try {
        await transport.disconnect();
      } catch {
        /* ignore */
      }
      if (this.transport === transport) this.transport = null;
      this.ev.onMonitor?.("closed");
    }
  }

  async stopMonitor(): Promise<void> {
    if (!this.monitorOpen) return;
    this.monitorStop = true;
    try {
      await this.transport?.disconnect();
    } catch {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Internals                                                          */
  /* ------------------------------------------------------------------ */

  private async cleanup(keepPort = false): Promise<void> {
    const transport = this.transport;
    this.transport = null;
    this.loader = null;
    if (transport) {
      try {
        await transport.disconnect();
      } catch {
        /* port may already be closed */
      }
    } else if (this.port && !keepPort) {
      try {
        await this.port.close();
      } catch {
        /* ignore */
      }
    }
    if (!keepPort) this.port = null;
  }

  private async collectChipInfo(loader: ESPLoaderType): Promise<ChipInfo> {
    const chip = loader.chip;
    const info: ChipInfo = { chip: chip.CHIP_NAME };
    try {
      info.description = await chip.getChipDescription(loader);
    } catch {
      /* optional */
    }
    try {
      info.features = await chip.getChipFeatures(loader);
    } catch {
      /* optional */
    }
    try {
      info.mac = await chip.readMac(loader);
    } catch {
      /* optional */
    }
    try {
      const f = await chip.getCrystalFreq(loader);
      if (Number.isFinite(f)) info.crystalMHz = f;
    } catch {
      /* optional */
    }
    try {
      info.flashSize = await loader.detectFlashSize();
      info.flashBytes = flashSizeToBytes(info.flashSize);
    } catch {
      /* optional */
    }
    try {
      const vid = loader.transport.getVid?.();
      const pid = loader.transport.getPid?.();
      info.vid = vid;
      info.pid = pid;
      info.usbJtagSerial = vid === 0x303a && pid === 0x1001;
    } catch {
      /* optional */
    }
    this.log(`Chip: ${info.description ?? info.chip}${info.mac ? ` · MAC ${info.mac}` : ""}${info.flashSize ? ` · Flash ${info.flashSize}` : ""}`);
    return info;
  }

  /**
   * Resets the chip into its application. esptool-js 0.7.0's `after("hard_reset")` only
   * releases RTS, which is a no-op when RTS is already low, so we pulse EN ourselves:
   * DTR low (IO0 released), RTS high (EN low → reset), wait, RTS low (EN high → boot).
   */
  private async safeReset(loader: ESPLoaderType | null) {
    const transport = loader?.transport ?? this.transport;
    if (!transport) return;
    try {
      await transport.setDTR(false);
      await transport.setRTS(true);
      await sleep(100);
      await transport.setRTS(false);
      await sleep(this.info?.usbJtagSerial ? 50 : 200);
    } catch {
      /* some bridges cannot toggle DTR/RTS; the user can press RESET */
    }
  }

  private async openSession(body: FlashSessionRequest): Promise<FlashSessionResponse> {
    let res: Response;
    try {
      res = await fetch("/api/flash/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch (err) {
      throw new FlashError("session-failed", undefined, "Kiểm tra kết nối mạng rồi thử lại.", err);
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as FlashApiError | null;
      if (data?.code === "incompatible-chip") {
        throw new FlashError("incompatible-chip", undefined, `Firmware hỗ trợ: ${(data.supported ?? []).join(", ")}.`);
      }
      if (data?.code === "demo-disabled") throw new FlashError("demo-disabled");
      throw new FlashError("session-failed", undefined, data?.error ?? `Máy chủ trả về mã ${res.status}.`);
    }
    return (await res.json()) as FlashSessionResponse;
  }

  private async fetchPart(token: string, index: number): Promise<Uint8Array<ArrayBuffer>> {
    let res: Response;
    try {
      res = await fetch(`/api/flash/part?i=${index}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch (err) {
      throw new FlashError("download-failed", undefined, "Kiểm tra kết nối mạng rồi thử lại.", err);
    }
    if (res.status === 410) throw new FlashError("session-expired");
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as FlashApiError | null;
      throw new FlashError("download-failed", undefined, data?.error ?? `Máy chủ trả về mã ${res.status}.`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  private async decryptPart(key: CryptoKey, nonce: string, index: number, wire: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    if (wire.byteLength < PART_IV_BYTES + PART_TAG_BYTES) throw new FlashError("decrypt-failed", undefined, "Gói quá ngắn — tải lại trang và thử lại.");
    const iv = wire.subarray(0, PART_IV_BYTES);
    const body = wire.subarray(PART_IV_BYTES);
    try {
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(partAad(nonce, index)), tagLength: PART_TAG_BYTES * 8 },
        key,
        body,
      );
      wire.fill(0);
      return new Uint8Array(plain);
    } catch (err) {
      throw new FlashError("decrypt-failed", undefined, undefined, err);
    }
  }
}

/* ---------- helpers ---------- */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function importKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", base64ToBytes(b64), { name: "AES-GCM" }, false, ["decrypt"]);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The session nonce is public (it is inside the signed token) and is only used as AAD/salt. */
function tokenNonce(token: string): string {
  const body = token.split(".")[0] ?? "";
  try {
    const json = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.n === "string" ? json.n : "";
  } catch {
    return "";
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

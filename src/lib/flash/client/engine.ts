/**
 * In-browser flashing engine built on esptool-js (Web Serial).
 *
 * Flow: request port → connect & detect chip → pick matching build → open a
 * signed session → fetch encrypted parts → decrypt in memory → writeFlash with
 * MD5 verification → hard reset → disconnect.
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
  | "incompatible"
  | "preparing"
  | "flashing"
  | "finishing"
  | "done"
  | "error";

export interface ChipInfo {
  chip: string;
  description?: string;
  features?: string[];
  mac?: string;
  flashSize?: string;
  crystalMHz?: number;
  usbJtagSerial?: boolean;
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

export interface FlashEngineEvents {
  onPhase?: (phase: FlashPhase) => void;
  onLog?: (line: string) => void;
  onChip?: (info: ChipInfo) => void;
  onPrepare?: (p: PrepareProgress) => void;
  onProgress?: (p: FlashProgress) => void;
  onIncompatible?: (detected: string, supported: ChipFamily[]) => void;
  onDone?: (summary: { chip: ChipInfo; firmware: FlashSessionResponse["firmware"]; seconds: number }) => void;
  onError?: (err: FlashError) => void;
}

export interface FlashEngineOptions {
  firmware: FirmwarePublic;
  events?: FlashEngineEvents;
  /** Override the build's baud rate (e.g. 230400 for flaky USB-UART bridges). */
  baudrate?: number;
  /** Force a full chip erase before writing. */
  eraseAll?: boolean;
  /** Milliseconds allowed for connect + chip detection. */
  connectTimeoutMs?: number;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator && typeof window !== "undefined" && window.isSecureContext;
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
  private readonly eraseOverride?: boolean;
  private readonly connectTimeoutMs: number;

  private transport: TransportType | null = null;
  private loader: ESPLoaderType | null = null;
  private port: SerialPort | null = null;
  private aborted = false;
  private running = false;
  private phase: FlashPhase = "idle";

  constructor(opts: FlashEngineOptions) {
    this.fw = opts.firmware;
    this.ev = opts.events ?? {};
    this.baudOverride = opts.baudrate;
    this.eraseOverride = opts.eraseAll;
    this.connectTimeoutMs = opts.connectTimeoutMs ?? 45_000;
  }

  get currentPhase(): FlashPhase {
    return this.phase;
  }

  private setPhase(p: FlashPhase) {
    this.phase = p;
    this.ev.onPhase?.(p);
  }

  private log(line: string) {
    this.ev.onLog?.(line);
  }

  private checkAborted() {
    if (this.aborted) throw new FlashError("aborted", "Đã huỷ", "Thiết bị có thể đang ở trạng thái dở dang. Hãy flash lại trước khi sử dụng.");
  }

  /** Cancels an in-flight run. Safe to call at any time. */
  async abort(): Promise<void> {
    this.aborted = true;
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    const transport = this.transport;
    this.transport = null;
    this.loader = null;
    if (transport) {
      try {
        await transport.disconnect();
      } catch {
        /* port may already be closed */
      }
    } else if (this.port) {
      try {
        await this.port.close();
      } catch {
        /* ignore */
      }
    }
    this.port = null;
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.aborted = false;
    const startedAt = performance.now();

    // Firmware bytes are kept here only; zeroed in `finally`.
    const images: Uint8Array[] = [];

    try {
      if (!isWebSerialSupported()) {
        throw new FlashError(
          "unsupported-browser",
          "Trình duyệt không hỗ trợ Web Serial",
          "Hãy dùng Chrome, Edge, Opera hoặc Arc trên máy tính. Safari, Firefox và trình duyệt di động chưa hỗ trợ.",
        );
      }

      /* 1. Port picker */
      this.setPhase("requesting-port");
      try {
        this.port = await navigator.serial.requestPort({});
      } catch (err) {
        throw toFlashError(err, "no-port-selected");
      }
      this.checkAborted();

      /* 2. Connect + detect */
      this.setPhase("connecting");
      const esptool = await import("esptool-js");
      const transport = new esptool.Transport(this.port, false);
      this.transport = transport;

      const terminal = {
        clean: () => {},
        writeLine: (data: string) => this.log(data),
        write: (data: string) => this.log(data),
      };

      const sessionBaud = this.baudOverride ?? this.pickDefaultBaud();
      const loader = new esptool.ESPLoader({
        transport,
        baudrate: sessionBaud,
        romBaudrate: 115200,
        terminal,
        debugLogging: false,
      });
      this.loader = loader;

      let chipName: string;
      try {
        chipName = await withTimeout(
          loader.main(),
          this.connectTimeoutMs,
          () =>
            new FlashError(
              "connect-failed",
              "Không kết nối được với bootloader",
              "Giữ nút BOOT (IO0), nhấn RESET (EN) rồi thả BOOT, sau đó thử lại. Kiểm tra cáp USB truyền được dữ liệu và driver đã cài.",
            ),
        );
      } catch (err) {
        throw toFlashError(err, "connect-failed");
      }
      this.checkAborted();

      this.setPhase("detecting");
      const info = await this.collectChipInfo(loader, chipName);
      this.ev.onChip?.(info);
      this.log(`Chip: ${info.description ?? info.chip}${info.mac ? ` · MAC ${info.mac}` : ""}`);

      /* 3. Pick build */
      const build = findBuildForChip(
        this.fw.chips.map((c) => ({ chipFamily: c })),
        chipName,
      );
      if (!build) {
        this.setPhase("incompatible");
        this.ev.onIncompatible?.(chipName, this.fw.chips);
        await this.safeReset(loader);
        return;
      }

      /* 4. Session + encrypted parts */
      this.setPhase("preparing");
      const session = await this.openSession({ firmwareId: this.fw.id, chip: chipName, mac: info.mac });
      this.checkAborted();
      const key = await crypto.subtle.importKey("raw", base64ToBytes(session.key), { name: "AES-GCM" }, false, ["decrypt"]);
      const nonce = tokenNonce(session.token);

      const totalBytes = session.build.parts.reduce((s, p) => s + p.size, 0);
      let received = 0;
      this.ev.onPrepare?.({ received, total: totalBytes });

      for (const part of session.build.parts) {
        this.checkAborted();
        const cipher = await this.fetchPart(session.token, part.index);
        const plain = await this.decryptPart(key, nonce, part.index, cipher);
        if (plain.byteLength !== part.size) {
          throw new FlashError("decrypt-failed", "Gói firmware không hợp lệ", "Kích thước không khớp — tải lại trang và thử lại.");
        }
        images.push(plain);
        received += plain.byteLength;
        this.ev.onPrepare?.({ received, total: totalBytes });
        this.log(`Đã nhận phần ${part.index + 1}/${session.build.parts.length} (${formatBytes(part.size)}) → 0x${part.offset.toString(16)}`);
      }

      /* 5. Flash */
      this.setPhase("flashing");
      const { md5 } = await import("js-md5");
      const sizes = session.build.parts.map((p) => p.size);
      const grandTotal = sizes.reduce((a, b) => a + b, 0);
      const doneBefore = sizes.map((_, i) => sizes.slice(0, i).reduce((a, b) => a + b, 0));

      // esptool-js reports progress against the (compressed) bytes of the current image;
      // we convert that to an overall fraction weighted by plaintext size.
      const reportProgress = (fileIndex: number, written: number, total: number) => {
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
          eraseAll: this.eraseOverride ?? session.build.eraseAll,
          compress: true,
          reportProgress,
          calculateMD5Hash: (image: Uint8Array) => md5(image),
        });
      } catch (err) {
        if (this.aborted) throw toFlashError(err, "aborted");
        throw toFlashError(err, "flash-failed");
      }

      /* 6. Reset + disconnect */
      this.setPhase("finishing");
      await this.safeReset(loader);
      await this.cleanup();

      this.setPhase("done");
      this.ev.onDone?.({
        chip: info,
        firmware: session.firmware,
        seconds: Math.round((performance.now() - startedAt) / 1000),
      });
    } catch (err) {
      const fe = toFlashError(err);
      await this.cleanup();
      this.setPhase("error");
      this.ev.onError?.(fe);
    } finally {
      for (const img of images) img.fill(0);
      images.length = 0;
      this.running = false;
    }
  }

  /** 460800 is reliable on CH340/CP210x; native USB-JTAG/serial ignores baud anyway. */
  private pickDefaultBaud(): number {
    return 460800;
  }

  private async collectChipInfo(loader: ESPLoaderType, chipName: string): Promise<ChipInfo> {
    const info: ChipInfo = { chip: chipName };
    const chip = loader.chip;
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
    } catch {
      /* optional */
    }
    try {
      const pid = loader.transport.getPid();
      info.usbJtagSerial = pid === 0x1001;
    } catch {
      /* optional */
    }
    return info;
  }

  private async safeReset(loader: ESPLoaderType) {
    try {
      await loader.after("hard_reset");
    } catch {
      /* some bridges cannot toggle DTR/RTS; user can press RESET */
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
      throw new FlashError("session-failed", "Không mở được phiên flash", "Kiểm tra kết nối mạng rồi thử lại.", err);
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as FlashApiError | null;
      if (data?.code === "incompatible-chip") {
        throw new FlashError("incompatible-chip", "Firmware không hỗ trợ chip này", `Firmware hỗ trợ: ${(data.supported ?? []).join(", ")}.`);
      }
      throw new FlashError("session-failed", "Không mở được phiên flash", data?.error ?? `Máy chủ trả về mã ${res.status}.`);
    }
    return (await res.json()) as FlashSessionResponse;
  }

  private async fetchPart(token: string, index: number): Promise<Uint8Array<ArrayBuffer>> {
    let res: Response;
    try {
      res = await fetch(`/api/flash/part?t=${encodeURIComponent(token)}&i=${index}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch (err) {
      throw new FlashError("download-failed", "Không nhận được gói firmware", "Kiểm tra kết nối mạng rồi thử lại.", err);
    }
    if (res.status === 410) {
      throw new FlashError("session-expired", "Phiên flash đã hết hạn", "Nhấn kết nối lại để bắt đầu phiên mới.");
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as FlashApiError | null;
      throw new FlashError("download-failed", "Không nhận được gói firmware", data?.error ?? `Máy chủ trả về mã ${res.status}.`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  private async decryptPart(key: CryptoKey, nonce: string, index: number, wire: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    if (wire.byteLength < PART_IV_BYTES + PART_TAG_BYTES) {
      throw new FlashError("decrypt-failed", "Gói firmware không hợp lệ", "Gói quá ngắn — tải lại trang và thử lại.");
    }
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
      throw new FlashError("decrypt-failed", "Gói firmware không hợp lệ", "Khoá phiên không khớp — tải lại trang và thử lại.", err);
    }
  }
}

/* ---------- helpers ---------- */

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

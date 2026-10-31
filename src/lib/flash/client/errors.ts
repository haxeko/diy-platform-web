/**
 * Maps low-level failures (Web Serial, esptool-js, fetch) to user-facing Vietnamese
 * messages with a concrete next step. Keep hints actionable.
 */
export type FlashErrorCode =
  | "unsupported-browser"
  | "no-port-selected"
  | "port-busy"
  | "connect-failed"
  | "chip-unknown"
  | "incompatible-chip"
  | "session-failed"
  | "session-expired"
  | "download-failed"
  | "decrypt-failed"
  | "flash-failed"
  | "verify-failed"
  | "aborted"
  | "unknown";

export class FlashError extends Error {
  readonly code: FlashErrorCode;
  readonly hint: string;
  readonly cause?: unknown;
  constructor(code: FlashErrorCode, message: string, hint: string, cause?: unknown) {
    super(message);
    this.name = "FlashError";
    this.code = code;
    this.hint = hint;
    this.cause = cause;
  }
}

export const FLASH_ERRORS: Record<FlashErrorCode, { title: string; hint: string }> = {
  "unsupported-browser": {
    title: "Trình duyệt không hỗ trợ Web Serial",
    hint: "Hãy dùng Chrome, Edge, Opera hoặc Arc trên máy tính (Windows, macOS, Linux, ChromeOS). Safari, Firefox và trình duyệt di động chưa hỗ trợ.",
  },
  "no-port-selected": {
    title: "Chưa chọn cổng kết nối",
    hint: "Nhấn lại nút kết nối và chọn cổng của bo mạch trong hộp thoại (thường là USB Serial, CP210x, CH340 hoặc USB JTAG/serial).",
  },
  "port-busy": {
    title: "Cổng đang được ứng dụng khác sử dụng",
    hint: "Đóng Arduino IDE, PlatformIO, ESPHome, Serial Monitor hoặc tab trình duyệt khác đang mở cổng này, rồi thử lại.",
  },
  "connect-failed": {
    title: "Không kết nối được với bootloader",
    hint: "Giữ nút BOOT (IO0), nhấn RESET (EN) rồi thả BOOT, sau đó thử lại. Kiểm tra cáp USB có truyền dữ liệu (không phải cáp chỉ sạc) và driver CP210x/CH340 đã cài.",
  },
  "chip-unknown": {
    title: "Không nhận diện được chip",
    hint: "Bo mạch có thể không phải ESP hoặc đang ở chế độ chạy ứng dụng. Thử vào chế độ bootloader thủ công (giữ BOOT khi cắm USB).",
  },
  "incompatible-chip": {
    title: "Firmware không hỗ trợ chip này",
    hint: "Chọn một firmware khác có bản dựng cho chip của bạn, hoặc dùng bo mạch đúng với dự án.",
  },
  "session-failed": {
    title: "Không mở được phiên flash",
    hint: "Tải lại trang và thử lại. Nếu vẫn lỗi, máy chủ có thể đang bận hoặc firmware chưa được phát hành.",
  },
  "session-expired": {
    title: "Phiên flash đã hết hạn",
    hint: "Phiên chỉ có hiệu lực vài phút. Nhấn kết nối lại để bắt đầu phiên mới.",
  },
  "download-failed": {
    title: "Không nhận được gói firmware",
    hint: "Kiểm tra kết nối mạng rồi thử lại. Gói firmware được truyền mã hoá trực tiếp vào bộ nhớ trình duyệt.",
  },
  "decrypt-failed": {
    title: "Gói firmware không hợp lệ",
    hint: "Khoá phiên không khớp — tải lại trang và thử lại.",
  },
  "flash-failed": {
    title: "Ghi flash thất bại",
    hint: "Giữ chắc kết nối USB, thử giảm tốc độ baud trong Tuỳ chọn nâng cao (230400) hoặc dùng cổng USB khác, rồi thử lại.",
  },
  "verify-failed": {
    title: "Kiểm tra MD5 không khớp",
    hint: "Dữ liệu ghi vào flash bị sai lệch. Thử lại với tốc độ baud thấp hơn hoặc bật 'Xoá toàn bộ flash'.",
  },
  aborted: {
    title: "Đã huỷ",
    hint: "Thiết bị có thể đang ở trạng thái dở dang. Hãy flash lại trước khi sử dụng.",
  },
  unknown: {
    title: "Có lỗi xảy ra",
    hint: "Thử lại. Nếu lỗi lặp lại, mở Nhật ký để xem chi tiết.",
  },
};

export function toFlashError(err: unknown, fallback: FlashErrorCode = "unknown"): FlashError {
  if (err instanceof FlashError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  const lower = msg.toLowerCase();

  let code: FlashErrorCode = fallback;
  if (name === "NotFoundError" || lower.includes("no port selected")) code = "no-port-selected";
  else if (
    name === "InvalidStateError" ||
    name === "NetworkError" ||
    lower.includes("failed to open serial port") ||
    lower.includes("already open") ||
    lower.includes("access denied") ||
    lower.includes("in use")
  )
    code = "port-busy";
  else if (lower.includes("failed to connect") || lower.includes("timed out waiting for packet") || lower.includes("timeout"))
    code = fallback === "flash-failed" ? "flash-failed" : "connect-failed";
  else if (lower.includes("unexpected chip") || lower.includes("unsupported chip") || lower.includes("chip id") || lower.includes("magic"))
    code = "chip-unknown";
  else if (lower.includes("md5")) code = "verify-failed";

  const { title, hint } = FLASH_ERRORS[code];
  return new FlashError(code, title, hint, err);
}

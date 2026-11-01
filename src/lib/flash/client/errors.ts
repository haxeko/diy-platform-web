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
  | "flash-too-small"
  | "session-failed"
  | "session-expired"
  | "demo-disabled"
  | "download-failed"
  | "decrypt-failed"
  | "flash-failed"
  | "verify-failed"
  | "disconnected"
  | "aborted"
  | "unknown";

export class FlashError extends Error {
  readonly code: FlashErrorCode;
  readonly hint: string;
  readonly cause?: unknown;
  constructor(code: FlashErrorCode, message?: string, hint?: string, cause?: unknown) {
    const base = FLASH_ERRORS[code];
    super(message ?? base.title);
    this.name = "FlashError";
    this.code = code;
    this.hint = hint ?? base.hint;
    this.cause = cause;
  }
}

export const FLASH_ERRORS: Record<FlashErrorCode, { title: string; hint: string }> = {
  "unsupported-browser": {
    title: "Trình duyệt này chưa hỗ trợ nạp qua USB",
    hint: "Hãy mở trang bằng Chrome, Edge, Opera hoặc Arc trên máy tính Windows, macOS hoặc Linux. Safari, Firefox và trình duyệt trên điện thoại chưa hỗ trợ Web Serial.",
  },
  "no-port-selected": {
    title: "Chưa chọn cổng kết nối",
    hint: "Nhấn Kết nối thiết bị và chọn cổng của board trong hộp thoại (thường là USB Serial, CP210x, CH340 hoặc USB JTAG/serial debug unit).",
  },
  "port-busy": {
    title: "Cổng đang được ứng dụng khác sử dụng",
    hint: "Đóng Arduino IDE, PlatformIO, ESPHome, Serial Monitor hoặc tab trình duyệt khác đang mở cổng này, rồi thử lại.",
  },
  "connect-failed": {
    title: "Không kết nối được với bootloader",
    hint: "Giữ nút BOOT (IO0), nhấn RESET (EN) rồi thả BOOT, sau đó nhấn Thử lại. Kiểm tra cáp USB có truyền dữ liệu (không phải cáp chỉ sạc) và driver CP210x/CH340 đã cài.",
  },
  "chip-unknown": {
    title: "Không nhận diện được chip",
    hint: "Board có thể không phải ESP hoặc đang chạy ứng dụng. Thử vào chế độ bootloader thủ công (giữ BOOT khi cắm USB).",
  },
  "incompatible-chip": {
    title: "Firmware này không có bản dựng cho chip của bạn",
    hint: "Chọn firmware khác có bản dựng cho chip này, hoặc dùng board đúng với dự án.",
  },
  "flash-too-small": {
    title: "Flash của board không đủ dung lượng",
    hint: "Firmware cần bộ nhớ flash lớn hơn dung lượng phát hiện trên board. Dùng board có flash lớn hơn (ví dụ bản 8 MB).",
  },
  "session-failed": {
    title: "Không mở được phiên nạp",
    hint: "Tải lại trang và thử lại. Nếu vẫn lỗi, máy chủ có thể đang bận hoặc firmware chưa được phát hành.",
  },
  "session-expired": {
    title: "Phiên nạp đã hết hạn",
    hint: "Phiên chỉ có hiệu lực vài phút. Nhấn Kết nối thiết bị để bắt đầu phiên mới.",
  },
  "demo-disabled": {
    title: "Firmware này là bản giữ chỗ (demo)",
    hint: "Máy chủ không phát firmware demo ở chế độ production. Chủ trang cần thay bằng firmware thật.",
  },
  "download-failed": {
    title: "Không nhận được gói firmware",
    hint: "Kiểm tra kết nối mạng rồi thử lại. Gói firmware được truyền mã hoá thẳng vào bộ nhớ trình duyệt.",
  },
  "decrypt-failed": {
    title: "Gói firmware không hợp lệ",
    hint: "Khoá phiên không khớp — tải lại trang và thử lại.",
  },
  "flash-failed": {
    title: "Ghi flash thất bại",
    hint: "Giữ chắc kết nối USB, thử tốc độ 230400 trong Tuỳ chọn nâng cao hoặc dùng cổng USB khác (tránh hub), rồi thử lại.",
  },
  "verify-failed": {
    title: "Kiểm tra MD5 không khớp",
    hint: "Dữ liệu ghi vào flash bị sai lệch. Thử lại với tốc độ thấp hơn hoặc chọn chế độ Cài mới (xoá toàn bộ).",
  },
  disconnected: {
    title: "Thiết bị đã ngắt kết nối giữa chừng",
    hint: "Cắm lại board, giữ cáp chắc chắn rồi nạp lại từ đầu.",
  },
  aborted: {
    title: "Đã huỷ",
    hint: "Thiết bị có thể đang ở trạng thái dở dang. Hãy nạp lại trước khi sử dụng.",
  },
  unknown: {
    title: "Có lỗi xảy ra",
    hint: "Thử lại. Nếu lỗi lặp lại, mở Nhật ký kỹ thuật để xem chi tiết.",
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
    lower.includes("failed to open serial port") ||
    lower.includes("already open") ||
    lower.includes("access denied") ||
    lower.includes("in use")
  )
    code = "port-busy";
  else if (name === "NetworkError" || lower.includes("device has been lost") || lower.includes("the device was disconnected"))
    code = fallback === "connect-failed" ? "port-busy" : "disconnected";
  else if (lower.includes("failed to connect") || lower.includes("timed out waiting for packet") || lower.includes("timeout"))
    code = fallback === "flash-failed" ? "flash-failed" : "connect-failed";
  else if (lower.includes("unexpected chip") || lower.includes("unsupported chip") || lower.includes("chip id") || lower.includes("magic"))
    code = "chip-unknown";
  else if (lower.includes("md5")) code = "verify-failed";

  return new FlashError(code, undefined, undefined, err);
}

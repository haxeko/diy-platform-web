"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { FirmwarePublic } from "@/lib/flash/shared";
import { useFlasher } from "@/lib/flash/client/useFlasher";
import { formatBytes } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StepList } from "@/components/ui/StepList";
import {
  IconBolt,
  IconCheckCircle,
  IconChevronDown,
  IconLock,
  IconRefresh,
  IconSpinner,
  IconUsb,
  IconX,
} from "@/components/ui/Icons";
import { ChipCard } from "./ChipCard";
import { FirmwarePicker, type ProjectRef } from "./FirmwarePicker";
import { LogConsole } from "./LogConsole";
import { PHASE_HINT, PHASE_LABEL, STRINGS } from "./strings";

const BAUD_OPTIONS = [921600, 460800, 230400, 115200] as const;

export interface FlasherProps {
  firmwares: FirmwarePublic[];
  /** Pre-selected firmware id. Defaults to the first one. */
  initialId?: string;
  /** Show the firmware list (true when more than one firmware is passed). */
  showPicker?: boolean;
  projects?: Record<string, ProjectRef>;
  className?: string;
}

export function Flasher({ firmwares, initialId, showPicker, projects, className }: FlasherProps) {
  const [selectedId, setSelectedId] = useState(initialId ?? firmwares[0]?.id ?? "");
  const [baudrate, setBaudrate] = useState<number>(460800);
  const [eraseAll, setEraseAll] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedId = useId();

  const firmware = useMemo(() => firmwares.find((f) => f.id === selectedId) ?? firmwares[0], [firmwares, selectedId]);
  const { state, start, abort, reset, busy } = useFlasher(firmware, { baudrate, eraseAll });

  if (!firmware) {
    return (
      <Callout tone="warning" title="Chưa có firmware nào được phát hành">
        Quay lại sau hoặc xem các dự án để biết thêm.
      </Callout>
    );
  }

  const picker = showPicker ?? firmwares.length > 1;
  const compatible = state.chip ? (state.incompatible ? false : true) : null;
  const overall = state.progress?.overall ?? 0;
  const prepareFrac = state.prepare && state.prepare.total > 0 ? state.prepare.received / state.prepare.total : 0;

  return (
    <section
      aria-label="Trình nạp firmware"
      className={cn("grid gap-5", picker ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : "mx-auto w-full max-w-3xl", className)}
    >
      {picker && (
        <div className="min-w-0">
          <FirmwarePicker firmwares={firmwares} selectedId={firmware.id} onSelect={setSelectedId} disabled={busy} projects={projects} />
        </div>
      )}

      <div className="min-w-0 rounded-card border border-separator bg-surface p-5 shadow-card sm:p-6">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Firmware đã chọn</p>
            <h3 className="mt-1 truncate text-[1.15rem] font-semibold text-label">
              {firmware.name} <span className="font-normal text-label-3">v{firmware.version}</span>
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {firmware.chips.map((c) => (
                <Badge key={c} tone="sky" size="sm">
                  {c}
                </Badge>
              ))}
              {firmware.demo && <Badge tone="warning" size="sm">{STRINGS.demoBadge}</Badge>}
            </div>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tint-soft text-tint-strong">
            <IconUsb size={22} />
          </span>
        </div>

        {/* body by phase */}
        <div className="mt-5 space-y-4">
          {state.supported === false && (
            <Callout tone="warning" title={STRINGS.unsupportedTitle}>
              {STRINGS.unsupportedBody}
            </Callout>
          )}

          {state.phase === "idle" && (
            <>
              <StepList steps={STRINGS.steps} />
              {firmware.demo && (
                <Callout tone="warning" title="Đây là firmware giữ chỗ (demo)">
                  File demo chỉ dùng để kiểm thử giao diện và luồng nạp, thiết bị sẽ không chạy được sau khi flash. Thay bằng firmware thật trước khi phát hành.
                </Callout>
              )}
            </>
          )}

          {busy && (
            <div className="rounded-[16px] bg-surface-2 p-4" aria-live="polite">
              <div className="flex items-center gap-3">
                <IconSpinner size={22} className="shrink-0 text-tint" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-label">{PHASE_LABEL[state.phase]}</p>
                  {PHASE_HINT[state.phase] && <p className="mt-0.5 text-[0.9rem] text-label-2">{PHASE_HINT[state.phase]}</p>}
                </div>
                {state.phase === "flashing" && state.progress && (
                  <span className="shrink-0 text-[1.35rem] font-bold tabular text-label">{Math.round(overall * 100)}%</span>
                )}
              </div>

              {state.phase === "preparing" && (
                <div className="mt-3">
                  <ProgressBar value={prepareFrac} indeterminate={!state.prepare} label="Tiến độ nhận firmware" size="sm" />
                  {state.prepare && (
                    <p className="mt-1.5 text-[0.8rem] text-label-3 tabular">
                      {formatBytes(state.prepare.received)} / {formatBytes(state.prepare.total)}
                    </p>
                  )}
                </div>
              )}

              {state.phase === "flashing" && (
                <div className="mt-3">
                  <ProgressBar value={overall} indeterminate={!state.progress} label="Tiến độ ghi firmware" />
                  {state.progress && (
                    <p className="mt-1.5 flex justify-between text-[0.8rem] text-label-3 tabular">
                      <span>{STRINGS.partOf(state.progress.partIndex + 1, state.progress.partCount)}</span>
                      <span>
                        {formatBytes(state.progress.bytesWritten)} / {formatBytes(state.progress.bytesTotal)}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {(state.phase === "requesting-port" || state.phase === "connecting" || state.phase === "detecting") && (
                <div className="mt-3">
                  <ProgressBar indeterminate label="Đang kết nối" size="sm" />
                </div>
              )}
            </div>
          )}

          {state.chip && <ChipCard info={state.chip} compatible={compatible} />}

          {state.phase === "incompatible" && state.incompatible && (
            <Callout tone="danger" title={`Firmware này không có bản dựng cho ${state.incompatible.detected}`}>
              {STRINGS.supported}: {state.incompatible.supported.join(", ")}. Hãy chọn firmware khác hoặc xem{" "}
              <Link href={`/firmware?chip=${encodeURIComponent(state.incompatible.detected)}`} className="font-semibold text-tint underline-offset-4 hover:underline">
                firmware cho {state.incompatible.detected}
              </Link>
              .
            </Callout>
          )}

          {state.phase === "error" && state.error && (
            <Callout tone={state.error.code === "aborted" ? "warning" : "danger"} title={state.error.message}>
              {state.error.hint}
            </Callout>
          )}

          {state.phase === "done" && state.done && (
            <div className="rounded-[16px] border border-[#bfe9cc] bg-success-soft p-4 animate-rise" role="status">
              <div className="flex items-start gap-3">
                <IconCheckCircle size={26} className="shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-[1.05rem] font-semibold text-label">{STRINGS.doneTitle}</p>
                  <p className="mt-0.5 text-[0.95rem] text-label-2">
                    {STRINGS.doneBody(state.done.firmware.name, state.done.firmware.version, state.done.seconds)}
                  </p>
                </div>
              </div>
              {firmware.afterFlash.length > 0 && (
                <div className="mt-4 rounded-[14px] bg-surface p-4">
                  <p className="mb-3 text-[0.95rem] font-semibold text-label">{STRINGS.nextSteps}</p>
                  <StepList steps={firmware.afterFlash.map((s) => ({ title: s }))} />
                </div>
              )}
            </div>
          )}

          {/* actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!busy && state.phase !== "done" && (
              <Button size="lg" icon={<IconBolt size={20} />} onClick={() => void start()} disabled={state.supported === false || state.supported === null}>
                {state.phase === "error" || state.phase === "incompatible" ? STRINGS.retry : STRINGS.connectAndFlash}
              </Button>
            )}
            {state.phase === "done" && (
              <Button size="lg" variant="tinted" icon={<IconRefresh size={20} />} onClick={reset}>
                {STRINGS.flashAnother}
              </Button>
            )}
            {busy && (
              <Button size="lg" variant="danger" icon={<IconX size={20} />} onClick={() => void abort()} disabled={state.phase === "finishing"}>
                {STRINGS.cancel}
              </Button>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-[0.8rem] text-label-3">
              <IconLock size={14} />
              Mã hoá theo phiên
            </span>
          </div>

          {/* advanced */}
          {!busy && state.phase !== "done" && (
            <div className="rounded-[16px] border border-separator">
              <button
                type="button"
                aria-expanded={advancedOpen}
                aria-controls={advancedId}
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-[0.9rem] font-semibold text-label-2 hover:text-label"
              >
                {STRINGS.advanced}
                <IconChevronDown size={18} className={cn("transition-transform duration-200", advancedOpen && "rotate-180")} />
              </button>
              {advancedOpen && (
                <div id={advancedId} className="space-y-4 border-t border-separator px-4 py-4">
                  <label className="flex items-center justify-between gap-4 text-[0.95rem]">
                    <span className="font-medium text-label">{STRINGS.baud}</span>
                    <select
                      value={baudrate}
                      onChange={(e) => setBaudrate(Number(e.target.value))}
                      className="h-10 rounded-[10px] border border-separator-strong bg-surface px-3 text-[0.95rem] text-label tabular"
                    >
                      {BAUD_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {b.toLocaleString("vi-VN")}
                          {b === 460800 ? " (mặc định)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-start gap-3 text-[0.95rem]">
                    <input
                      type="checkbox"
                      checked={eraseAll}
                      onChange={(e) => setEraseAll(e.target.checked)}
                      className="mt-1 size-5 shrink-0 accent-[var(--color-tint)]"
                    />
                    <span>
                      <span className="font-medium text-label">{STRINGS.eraseAll}</span>
                      <span className="mt-0.5 block text-[0.875rem] text-label-3">{STRINGS.eraseAllHint}</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <LogConsole lines={state.log} defaultOpen={state.phase === "error"} />

          <p className="flex items-start gap-2 text-[0.8rem] leading-relaxed text-label-3">
            <IconLock size={14} className="mt-0.5 shrink-0" />
            {STRINGS.privacy}
          </p>
        </div>
      </div>
    </section>
  );
}

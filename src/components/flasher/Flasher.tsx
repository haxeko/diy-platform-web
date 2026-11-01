"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { FirmwarePublic } from "@/lib/flash/shared";
import { useFlasher } from "@/lib/flash/client/useFlasher";
import { formatBytes } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ClientQr } from "@/components/ui/ClientQr";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StepList } from "@/components/ui/StepList";
import {
  IconBolt,
  IconCheckCircle,
  IconChevronDown,
  IconLock,
  IconRefresh,
  IconSpinner,
  IconTerminal,
  IconUsb,
  IconX,
} from "@/components/ui/Icons";
import { ChipCard } from "./ChipCard";
import { FirmwarePicker, type ProjectRef } from "./FirmwarePicker";
import { LogConsole } from "./LogConsole";
import { MatterPairingCard } from "./MatterPairingCard";
import { SerialMonitor } from "./SerialMonitor";
import { PHASE_HINT, PHASE_LABEL, STRINGS } from "./strings";

const BAUD_OPTIONS = [921600, 460800, 230400, 115200] as const;
type EraseMode = "update" | "fresh";

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
  const [eraseMode, setEraseMode] = useState<EraseMode>("update");
  const [eraseConfirmed, setEraseConfirmed] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedId = useId();
  const regionRef = useRef<HTMLDivElement>(null);

  const firmware = useMemo(() => firmwares.find((f) => f.id === selectedId) ?? firmwares[0], [firmwares, selectedId]);
  const { state, connect, flash, disconnect, abort, reset, startMonitor, stopMonitor, busy } = useFlasher(firmware, { baudrate });
  const { phase } = state;

  useEffect(() => {
    if (phase === "detected" || phase === "done" || phase === "error" || phase === "incompatible") regionRef.current?.focus();
  }, [phase]);

  if (!firmware) {
    return (
      <Callout tone="warning" title="Chưa có firmware nào được phát hành">
        Quay lại sau hoặc xem các dự án để biết thêm.
      </Callout>
    );
  }

  const picker = showPicker ?? firmwares.length > 1;
  const pickerLocked = phase !== "idle" && phase !== "error";
  const forcedErase = firmware.forceErase;
  const effectiveErase = forcedErase || eraseMode === "fresh";
  const canFlash = phase === "detected" && (!effectiveErase || forcedErase || eraseConfirmed);
  const overall = state.progress?.overall ?? 0;
  const prepareFrac = state.prepare && state.prepare.total > 0 ? state.prepare.received / state.prepare.total : 0;
  const pairing = state.monitor.pairing ?? (firmware.pairing && (firmware.pairing.qr || firmware.pairing.manualCode) ? firmware.pairing : null);
  const pairingSource: "device" | "manifest" = state.monitor.pairing ? "device" : "manifest";

  const onSelect = (id: string) => {
    if (pickerLocked) return;
    setSelectedId(id);
    setEraseConfirmed(false);
    reset();
  };

  const statusRow = (
    <div className="rounded-[16px] bg-surface-2 p-4">
      <div className="flex items-center gap-3">
        <IconSpinner size={22} className="shrink-0 text-tint" />
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <p className="font-semibold text-label">{PHASE_LABEL[phase]}</p>
          {PHASE_HINT[phase] && <p className="mt-0.5 text-[0.9rem] text-label-2">{PHASE_HINT[phase]}</p>}
        </div>
        {phase === "flashing" && state.progress && (
          <span className="shrink-0 text-[1.35rem] font-bold tabular text-label" aria-hidden="true">
            {Math.round(overall * 100)}%
          </span>
        )}
      </div>
      {phase === "preparing" && (
        <div className="mt-3">
          <ProgressBar value={prepareFrac} indeterminate={!state.prepare} label="Tiến độ nhận firmware" size="sm" />
          {state.prepare && (
            <p className="mt-1.5 text-[0.8rem] text-label-3 tabular">
              {formatBytes(state.prepare.received)} / {formatBytes(state.prepare.total)}
            </p>
          )}
        </div>
      )}
      {(phase === "flashing" || phase === "erasing") && (
        <div className="mt-3">
          <ProgressBar value={overall} indeterminate={phase === "erasing" || !state.progress} label="Tiến độ ghi firmware" />
          {state.progress && phase === "flashing" && (
            <p className="mt-1.5 flex justify-between text-[0.8rem] text-label-3 tabular">
              <span>{STRINGS.partOf(state.progress.partIndex + 1, state.progress.partCount)}</span>
              <span>
                {formatBytes(state.progress.bytesWritten)} / {formatBytes(state.progress.bytesTotal)}
              </span>
            </p>
          )}
        </div>
      )}
      {(phase === "requesting-port" || phase === "connecting" || phase === "detecting" || phase === "finishing") && (
        <div className="mt-3">
          <ProgressBar indeterminate label="Đang kết nối" size="sm" />
        </div>
      )}
    </div>
  );

  return (
    <section
      aria-label="Trình nạp firmware"
      className={cn("grid gap-5", picker ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : "mx-auto w-full max-w-3xl", className)}
    >
      {picker && (
        <div className="min-w-0">
          <FirmwarePicker firmwares={firmwares} selectedId={firmware.id} onSelect={onSelect} disabled={pickerLocked} projects={projects} />
        </div>
      )}

      <div className="min-w-0 rounded-card-lg border border-separator bg-surface p-5 shadow-card sm:p-6">
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
              {firmware.minFlashMB && <Badge tone="neutral" size="sm">Flash ≥ {firmware.minFlashMB} MB</Badge>}
            </div>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tint-soft text-tint-strong">
            <IconUsb size={22} />
          </span>
        </div>

        <div ref={regionRef} tabIndex={-1} className="mt-5 space-y-4 outline-none">
          {/* browser gate */}
          {/* `supported` is only ever false after mount, so this branch never renders on the server. */}
          {state.supported === false && (
            <Callout tone="warning" title={STRINGS.gateTitle}>
              <p>{STRINGS.gateBody}</p>
              {!window.isSecureContext && <p className="mt-1">{STRINGS.gateHttps}</p>}
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <ClientQr value={window.location.href} size={112} label={STRINGS.gateQr} className="p-2" />
                <div className="space-y-2">
                  <p className="text-[0.85rem]">{STRINGS.gateQr}</p>
                  <CopyButton value={window.location.href} label={STRINGS.gateCopyLink} size="sm" />
                </div>
              </div>
            </Callout>
          )}

          {phase === "idle" && (
            <>
              <StepList steps={STRINGS.steps} />
              {firmware.demo && (
                <Callout tone="warning" title="Đây là firmware giữ chỗ (demo)">
                  File demo chỉ dùng để kiểm thử giao diện và luồng nạp, thiết bị sẽ không chạy được sau khi nạp. Thay bằng firmware thật trước khi phát hành.
                </Callout>
              )}
            </>
          )}

          {busy && statusRow}

          {state.chip && phase !== "idle" && <ChipCard info={state.chip} compatible={phase === "incompatible" ? false : true} />}

          {phase === "detected" && (
            <div className="space-y-3 rounded-[16px] border border-separator p-4">
              <p className="text-[0.9rem] font-semibold text-label">{STRINGS.eraseMode}</p>
              {forcedErase ? (
                <Callout tone="warning" role="note">
                  {STRINGS.eraseForced}
                </Callout>
              ) : (
                <SegmentedControl<EraseMode>
                  ariaLabel={STRINGS.eraseMode}
                  value={eraseMode}
                  onChange={(v) => {
                    setEraseMode(v);
                    setEraseConfirmed(false);
                  }}
                  options={[
                    { value: "update", label: `${STRINGS.eraseUpdate} · ${STRINGS.eraseUpdateHint}` },
                    { value: "fresh", label: `${STRINGS.eraseFresh} · ${STRINGS.eraseFreshHint}` },
                  ]}
                />
              )}
              {effectiveErase && !forcedErase && (
                <Callout tone="warning" role="note">
                  <p>{STRINGS.eraseConfirm}</p>
                  <label className="mt-2 flex items-center gap-2 text-[0.9rem] text-label">
                    <input type="checkbox" checked={eraseConfirmed} onChange={(e) => setEraseConfirmed(e.target.checked)} className="size-4 accent-[var(--color-tint)]" />
                    {STRINGS.eraseConfirmCheck}
                  </label>
                </Callout>
              )}
            </div>
          )}

          {phase === "incompatible" && state.incompatible && (
            <Callout
              tone="danger"
              title={
                state.incompatible.reason === "flash-too-small"
                  ? `Flash của ${state.incompatible.detected} nhỏ hơn mức firmware cần (≥ ${firmware.minFlashMB ?? "?"} MB)`
                  : `Firmware này không có bản dựng cho ${state.incompatible.detected}`
              }
            >
              {state.incompatible.reason === "chip" ? (
                <>
                  {STRINGS.supported}: {state.incompatible.supported.join(", ")}. Hãy chọn firmware khác hoặc xem{" "}
                  <Link href={`/firmware?chip=${encodeURIComponent(state.incompatible.detected)}`} className="font-semibold text-tint underline-offset-4 hover:underline">
                    firmware cho {state.incompatible.detected}
                  </Link>
                  .
                </>
              ) : (
                <>Dùng board có flash lớn hơn hoặc chọn firmware khác.</>
              )}
            </Callout>
          )}

          {phase === "error" && state.error && (
            <Callout tone={state.error.code === "aborted" ? "warning" : "danger"} title={state.error.message}>
              {state.error.hint}
            </Callout>
          )}

          {phase === "done" && state.done && (
            <div className="rounded-[16px] border border-[#bfe9cc] bg-success-soft p-4 animate-rise" role="status">
              <div className="flex items-start gap-3">
                <IconCheckCircle size={26} className="shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-[1.05rem] font-semibold text-label">{STRINGS.doneTitle(state.chip?.chip ?? "")}</p>
                  <p className="mt-0.5 text-[0.95rem] text-label-2">
                    {STRINGS.doneBody(state.done.firmware.name, state.done.firmware.version, formatBytes(state.done.bytes), state.done.seconds)}
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

          {phase === "done" && pairing && <MatterPairingCard pairing={pairing} source={pairingSource} />}

          {phase === "done" && state.monitor.open && <SerialMonitor lines={state.monitor.lines} open={state.monitor.open} onClose={() => void stopMonitor()} />}

          {/* actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {(phase === "idle" || phase === "error" || phase === "incompatible") && (
              <Button size="lg" icon={<IconBolt size={20} />} onClick={() => void connect()} disabled={state.supported !== true}>
                {phase === "idle" ? STRINGS.connect : STRINGS.retry}
              </Button>
            )}
            {phase === "detected" && (
              <>
                <Button size="lg" icon={<IconBolt size={20} />} onClick={() => void flash(effectiveErase)} disabled={!canFlash}>
                  {STRINGS.flash(state.chip?.chip ?? "")}
                </Button>
                <Button size="lg" variant="secondary" onClick={() => void disconnect()}>
                  {STRINGS.disconnect}
                </Button>
              </>
            )}
            {busy && (
              <Button size="lg" variant="danger" icon={<IconX size={20} />} onClick={() => void abort()} disabled={phase === "finishing"}>
                {STRINGS.cancel}
              </Button>
            )}
            {phase === "done" && (
              <>
                {state.monitor.open ? (
                  <Button size="lg" variant="secondary" icon={<IconTerminal size={20} />} onClick={() => void stopMonitor()}>
                    {STRINGS.closeSerial}
                  </Button>
                ) : (
                  <Button size="lg" variant="tinted" icon={<IconTerminal size={20} />} onClick={() => void startMonitor()}>
                    {STRINGS.openSerial}
                  </Button>
                )}
                <Button size="lg" variant="secondary" icon={<IconRefresh size={20} />} onClick={reset}>
                  {STRINGS.flashAnother}
                </Button>
              </>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-[0.8rem] text-label-3">
              <IconLock size={14} />
              Mã hoá theo phiên
            </span>
          </div>

          {/* advanced */}
          {(phase === "idle" || phase === "error") && (
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
                    <span>
                      <span className="font-medium text-label">{STRINGS.baud}</span>
                      <span className="mt-0.5 block text-[0.85rem] text-label-3">Tự hạ xuống 115200 nếu không kết nối được.</span>
                    </span>
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
                </div>
              )}
            </div>
          )}

          <LogConsole lines={state.log} forceOpen={phase === "error"} />

          <p className="flex items-start gap-2 text-[0.8rem] leading-relaxed text-label-3">
            <IconLock size={14} className="mt-0.5 shrink-0" />
            {STRINGS.privacy}
          </p>
        </div>
      </div>
    </section>
  );
}

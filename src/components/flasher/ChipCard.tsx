import type { ChipInfo } from "@/lib/flash/client/engine";
import { Badge } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/Icons";
import { STRINGS } from "./strings";

export function ChipCard({ info, compatible }: { info: ChipInfo; compatible: boolean | null }) {
  return (
    <div className="rounded-[16px] border border-separator bg-surface-2 p-4 animate-rise">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-surface text-tint shadow-card">
          <IconChip size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[1.05rem] font-semibold text-label">{info.chip}</span>
            {compatible === true && <Badge tone="success" dot>Tương thích</Badge>}
            {compatible === false && <Badge tone="danger" dot>Không tương thích</Badge>}
            {info.usbJtagSerial && <Badge tone="neutral" size="sm">USB‑JTAG/serial</Badge>}
          </div>
          {info.description && info.description !== info.chip && <p className="mt-0.5 text-[0.9rem] text-label-2">{info.description}</p>}
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[0.875rem] sm:grid-cols-2">
            {info.mac && (
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-label-3">{STRINGS.mac}</dt>
                <dd className="font-mono text-label">{info.mac}</dd>
              </div>
            )}
            {info.flashSize && (
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-label-3">{STRINGS.flashSize}</dt>
                <dd className="text-label">{info.flashSize}</dd>
              </div>
            )}
            {info.crystalMHz && (
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-label-3">{STRINGS.crystal}</dt>
                <dd className="text-label">{info.crystalMHz} MHz</dd>
              </div>
            )}
            {info.features && info.features.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-label-3">{STRINGS.features}</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {info.features.slice(0, 8).map((f) => (
                    <Badge key={f} tone="neutral" size="sm">
                      {f}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

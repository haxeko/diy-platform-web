"use client";

import type { PairingInfo } from "@/lib/flash/client/engine";
import { ClientQr } from "@/components/ui/ClientQr";
import { CopyButton } from "@/components/ui/CopyButton";
import { IconMatter } from "@/components/ui/Icons";
import { STRINGS } from "./strings";

function formatManual(code: string): string {
  // 11 digits → 3497-011-2332 ; 21 digits → 6361-8793-4587-4863-82031
  if (code.length === 11) return `${code.slice(0, 4)}-${code.slice(4, 7)}-${code.slice(7)}`;
  if (code.length === 21) return code.replace(/(\d{4})(?=\d)/g, "$1-");
  return code;
}

export function MatterPairingCard({ pairing, source }: { pairing: PairingInfo; source: "device" | "manifest" }) {
  if (!pairing.qr && !pairing.manualCode) return null;
  return (
    <div className="rounded-[16px] border border-separator bg-surface p-4 animate-rise" aria-label={STRINGS.pairingTitle}>
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-mint-soft text-mint">
          <IconMatter size={18} />
        </span>
        <div>
          <p className="font-semibold text-label">{STRINGS.pairingTitle}</p>
          <p className="text-[0.8rem] text-label-3">{source === "device" ? STRINGS.pairingFromDevice : STRINGS.pairingFromManifest}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
        {pairing.qr && <ClientQr value={pairing.qr} size={150} label="Mã QR ghép nối Matter" />}
        <div className="min-w-0 flex-1 space-y-3">
          {pairing.manualCode && (
            <div>
              <p className="text-[0.85rem] text-label-3">{STRINGS.pairingManual}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[1.25rem] font-semibold tracking-wide text-label tabular">{formatManual(pairing.manualCode)}</span>
                <CopyButton value={pairing.manualCode} size="sm" label="Sao chép mã" />
              </div>
            </div>
          )}
          {pairing.qr && (
            <div>
              <p className="text-[0.85rem] text-label-3">Payload QR</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="rounded bg-fill px-1.5 py-0.5 font-mono text-[0.8rem] text-label">{pairing.qr}</code>
                <CopyButton value={pairing.qr} size="sm" label="Sao chép" />
              </div>
            </div>
          )}
          <p className="text-[0.8rem] leading-relaxed text-label-3">{STRINGS.pairingNote}</p>
        </div>
      </div>
    </div>
  );
}

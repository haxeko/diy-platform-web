import type { SiteConfig } from "@/lib/content/site";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { IconCoffee, IconExternal, IconPhone, IconWallet } from "@/components/ui/Icons";
import { QrCode } from "@/components/ui/QrCode";
import { truncateMiddle } from "@/lib/format";

export async function MomoCard({ momo }: { momo: NonNullable<SiteConfig["donate"]["momo"]> }) {
  const qrValue = momo.qrPayload?.trim() || momo.phone;
  return (
    <Card as="section" padding="lg" tint="rose" aria-labelledby="donate-momo" className="flex flex-col">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#a50064] text-white shadow-card">
          <IconPhone size={22} />
        </span>
        <div>
          <h2 id="donate-momo" className="title-2 text-label">
            MoMo
          </h2>
          <p className="text-[0.9rem] text-label-2">Ví điện tử phổ biến tại Việt Nam</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <QrCode value={qrValue} size={168} label={`Mã QR MoMo của ${momo.accountName}`} />
        <dl className="w-full space-y-3 text-[0.95rem]">
          <div>
            <dt className="text-label-3">Số điện thoại</dt>
            <dd className="mt-0.5 flex items-center justify-between gap-3">
              <span className="font-semibold tabular text-label">{momo.phone}</span>
              <CopyButton value={momo.phone} size="sm" />
            </dd>
          </div>
          <div>
            <dt className="text-label-3">Tên tài khoản</dt>
            <dd className="mt-0.5 font-semibold text-label">{momo.accountName}</dd>
          </div>
          {momo.note && (
            <div>
              <dt className="text-label-3">Ghi chú</dt>
              <dd className="mt-0.5 text-label-2">{momo.note}</dd>
            </div>
          )}
        </dl>
      </div>
      <p className="mt-4 text-[0.85rem] leading-relaxed text-label-3">
        Mở ứng dụng MoMo → <strong className="font-semibold text-label-2">Quét mã</strong> hoặc <strong className="font-semibold text-label-2">Chuyển tiền</strong> → nhập số điện thoại ở trên.
      </p>
    </Card>
  );
}

export async function BuyMeACoffeeCard({ bmc }: { bmc: NonNullable<SiteConfig["donate"]["buyMeACoffee"]> }) {
  const url = `https://buymeacoffee.com/${encodeURIComponent(bmc.username)}`;
  return (
    <Card as="section" padding="lg" tint="lemon" aria-labelledby="donate-bmc" className="flex flex-col">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#ffdd00] text-[#1c1c1e] shadow-card">
          <IconCoffee size={22} />
        </span>
        <div>
          <h2 id="donate-bmc" className="title-2 text-label">
            Buy Me a Coffee
          </h2>
          <p className="text-[0.9rem] text-label-2">Thẻ quốc tế, PayPal, Apple Pay</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <QrCode value={url} size={168} label="Mã QR dẫn tới trang Buy Me a Coffee" />
        <div className="w-full">
          <p className="text-[0.95rem] leading-relaxed text-label-2">
            Mời mình một ly cà phê để duy trì máy chủ và mua linh kiện cho dự án tiếp theo. Mỗi ly đều được ghi nhận trên trang.
          </p>
          <Button href={url} external variant="primary" className="mt-4 bg-[#1c1c1e] hover:bg-black" iconRight={<IconExternal size={18} />}>
            buymeacoffee.com/{bmc.username}
          </Button>
          {bmc.note && <p className="mt-3 text-[0.85rem] text-label-3">{bmc.note}</p>}
        </div>
      </div>
    </Card>
  );
}

export async function CryptoCard({ wallets }: { wallets: SiteConfig["donate"]["crypto"] }) {
  return (
    <Card as="section" padding="lg" tint="lavender" aria-labelledby="donate-crypto" className="lg:col-span-2">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[14px] bg-lavender text-white shadow-card">
          <IconWallet size={22} />
        </span>
        <div>
          <h2 id="donate-crypto" className="title-2 text-label">
            Blockchain
          </h2>
          <p className="text-[0.9rem] text-label-2">Chuyển trực tiếp vào ví, không qua trung gian</p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {wallets.map((w) => {
          const uri = `${w.uriScheme ?? ""}${w.address}`;
          return (
            <li key={`${w.symbol}-${w.network}`} className="flex flex-col rounded-[16px] bg-surface p-4 shadow-card">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-label">{w.symbol}</span>
                <span className="text-[0.9rem] text-label-3">{w.name}</span>
              </div>
              <Badge tone="lavender" size="sm" className="mt-2 self-start whitespace-normal text-left leading-snug">
                {w.network}
              </Badge>
              <div className="mt-3 flex items-start gap-3">
                <QrCode value={uri} size={96} label={`Mã QR địa chỉ ${w.symbol} (${w.network})`} className="shrink-0 p-1.5" />
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-[0.78rem] leading-relaxed text-label" title={w.address}>
                    <span className="sm:hidden">{truncateMiddle(w.address, 12, 10)}</span>
                    <span className="hidden sm:inline">{w.address}</span>
                  </p>
                  {w.note && <p className="mt-1 text-[0.8rem] text-label-3">{w.note}</p>}
                  <CopyButton value={w.address} size="sm" className="mt-2" label="Sao chép địa chỉ" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Callout tone="warning" className="mt-5" role="note" title="Kiểm tra kỹ trước khi gửi">
        Chọn đúng mạng ghi trên từng ví và đối chiếu 4 ký tự đầu, 4 ký tự cuối của địa chỉ sau khi dán. Giao dịch blockchain không thể hoàn lại.
      </Callout>
    </Card>
  );
}

import { Button } from "@/components/ui/Button";
import { IconArrowRight, IconBolt, IconChip, IconLock, IconUsb } from "@/components/ui/Icons";

export function Hero({ siteName, tagline }: { siteName: string; tagline: string }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_20%_10%,rgb(220_236_255/0.9),transparent_60%),radial-gradient(50%_50%_at_85%_20%,rgb(233_228_255/0.9),transparent_60%),radial-gradient(40%_40%_at_60%_80%,rgb(220_245_234/0.8),transparent_60%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:px-8 lg:pt-20 lg:pb-16">
        <div className="animate-rise">
          <p className="eyebrow">{siteName} · ESP32 · Matter · Thread</p>
          <h1 className="title-large mt-4 max-w-xl text-balance text-label">Dự án nhà thông minh DIY, nạp firmware ngay trên trình duyệt.</h1>
          <p className="mt-5 max-w-xl text-[1.1rem] leading-relaxed text-label-2 text-pretty">{tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/firmware" size="lg" icon={<IconBolt size={20} />}>
              Flash firmware
            </Button>
            <Button href="/du-an" size="lg" variant="tinted" iconRight={<IconArrowRight size={20} />}>
              Khám phá dự án
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.9rem] text-label-2">
            <li className="inline-flex items-center gap-1.5"><IconUsb size={16} className="text-tint" />Không cần cài phần mềm</li>
            <li className="inline-flex items-center gap-1.5"><IconChip size={16} className="text-tint" />Tự nhận diện chip</li>
            <li className="inline-flex items-center gap-1.5"><IconLock size={16} className="text-tint" />Firmware không tải về máy</li>
          </ul>
        </div>

        {/* Illustrative flasher sheet */}
        <div className="animate-rise [animation-delay:120ms]" aria-hidden="true">
          <div className="mx-auto max-w-sm rounded-card-lg border border-separator bg-surface p-5 shadow-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Firmware đã chọn</p>
                <p className="mt-1 font-semibold text-label">Matter Light <span className="font-normal text-label-3">v1.0.0</span></p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-tint-soft text-tint-strong"><IconUsb size={20} /></span>
            </div>
            <div className="mt-5 rounded-[16px] bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[10px] bg-surface text-tint shadow-card"><IconChip size={20} /></span>
                <div className="flex-1">
                  <p className="text-[0.95rem] font-semibold text-label">ESP32-C6 <span className="ml-1 rounded-pill bg-success-soft px-2 py-0.5 text-[0.7rem] font-semibold text-[#1b7a3a]">Tương thích</span></p>
                  <p className="text-[0.8rem] text-label-3">MAC 40:4c:ca:4f:12:9e · 4MB</p>
                </div>
                <span className="text-[1.2rem] font-bold tabular text-label">72%</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-pill bg-fill">
                <div className="h-full w-[72%] rounded-pill bg-tint" />
              </div>
              <p className="mt-2 text-[0.8rem] text-label-3">Đang ghi firmware vào chip… Phần 3/3</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex h-11 items-center gap-2 rounded-control bg-tint px-5 font-semibold text-on-tint"><IconBolt size={18} />Kết nối &amp; Flash</span>
              <span className="inline-flex items-center gap-1 text-[0.8rem] text-label-3"><IconLock size={14} />Mã hoá theo phiên</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

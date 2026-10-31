import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function make(paths: string, viewBox = "0 0 24 24") {
  return function Icon({ size = 20, className, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
        dangerouslySetInnerHTML={{ __html: paths }}
        {...rest}
      />
    );
  };
}

export const IconChevronRight = make('<path d="m9 6 6 6-6 6"/>');
export const IconChevronDown = make('<path d="m6 9 6 6 6-6"/>');
export const IconArrowRight = make('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>');
export const IconCheck = make('<path d="m5 12 5 5L20 7"/>');
export const IconCheckCircle = make('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9.5"/>');
export const IconX = make('<path d="M6 6l12 12M18 6 6 18"/>');
export const IconBolt = make('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>');
export const IconUsb = make('<path d="M12 2v14"/><path d="m9 5 3-3 3 3"/><circle cx="12" cy="19" r="2.5"/><path d="M8 10.5 12 13"/><path d="M16 9l-4 2.5"/><circle cx="7.5" cy="9.5" r="1.2"/><rect x="15" y="7" width="3" height="3" rx=".5"/>');
export const IconChip = make('<rect x="6" y="6" width="12" height="12" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M12 2v4M15 2v4M9 18v4M12 18v4M15 18v4M2 9h4M2 12h4M2 15h4M18 9h4M18 12h4M18 15h4"/>');
export const IconWarning = make('<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>');
export const IconInfo = make('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".6" fill="currentColor"/>');
export const IconCopy = make('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>');
export const IconExternal = make('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v4.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11A1.5 1.5 0 0 1 6.5 6H11"/>');
export const IconCoffee = make('<path d="M4 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c0 1 .8 1.2.8 2.2M11 3.5c0 1 .8 1.2.8 2.2"/>');
export const IconWallet = make('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor"/>');
export const IconPhone = make('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>');
export const IconShield = make('<path d="M12 3 4.5 6v5.5c0 4.4 3.1 7.9 7.5 9.5 4.4-1.6 7.5-5.1 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/>');
export const IconLock = make('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>');
export const IconBook = make('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>');
export const IconHome = make('<path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 10v10h13V10"/>');
export const IconGrid = make('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>');
export const IconHeart = make('<path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z"/>');
export const IconRefresh = make('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>');
export const IconSparkle = make('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>');
export const IconTerminal = make('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m7 9 3 3-3 3M12.5 15H17"/>');
export const IconWifi = make('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a10 10 0 0 1 13 0"/><path d="M8.5 16a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r=".8" fill="currentColor"/>');
export const IconMesh = make('<circle cx="12" cy="5" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="m10.6 6.7-4.2 8.6M13.4 6.7l4.2 8.6M7 17h10"/>');
export const IconMatter = make('<path d="M12 3v7.5M12 10.5l6.5 3.75M12 10.5 5.5 14.25"/><circle cx="12" cy="3" r="1.4"/><circle cx="18.5" cy="14.25" r="1.4"/><circle cx="5.5" cy="14.25" r="1.4"/><path d="M12 21v-4M8.5 19l3.5 2 3.5-2"/>');
export const IconClock = make('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
export const IconGauge = make('<path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 15 4-5"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/>');
export const IconDownloadOff = make('<path d="M12 4v8"/><path d="m8.5 9.5 3.5 3.5 3.5-3.5"/><path d="M4 17.5v1A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-1"/><path d="M3 3l18 18"/>');
export const IconLayers = make('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>');
export const IconSearch = make('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/>');
export const IconMenu = make('<path d="M4 7h16M4 12h16M4 17h16"/>');
export const IconPlay = make('<path d="M7 5v14l11-7L7 5Z"/>');

export function IconSpinner({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

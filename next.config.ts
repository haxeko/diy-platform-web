import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Web Serial is required for in-browser flashing; everything else stays off.
    value: "serial=(self), usb=(self), camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained build (.next/standalone) for small hosts such as a Raspberry Pi: see scripts/pi/.
  output: "standalone",
  // No next/image usage → no sharp binary needed on the target machine.
  images: { unoptimized: true },
  // Firmware binaries and content live outside /public; make sure standalone/serverless bundles include them.
  outputFileTracingIncludes: {
    "/**": ["./firmware/**/*", "./content/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Firmware bytes must never be cached by the browser, a proxy or a CDN.
        source: "/api/flash/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;

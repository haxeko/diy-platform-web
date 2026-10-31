import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CONTENT_DIR } from "./load";

const url = z.string().url().max(300);

export const CryptoWalletSchema = z.object({
  /** e.g. "BTC", "ETH", "USDT" */
  symbol: z.string().min(1).max(12),
  name: z.string().min(1).max(60),
  /** e.g. "Bitcoin", "Ethereum / EVM", "TRON (TRC20)", "Solana" */
  network: z.string().min(1).max(60),
  address: z.string().min(8).max(200),
  /** Optional URI prefix used for the QR code, e.g. "bitcoin:" or "ethereum:" */
  uriScheme: z.string().max(20).optional(),
  note: z.string().max(200).optional(),
});
export type CryptoWallet = z.infer<typeof CryptoWalletSchema>;

export const SiteConfigSchema = z.object({
  name: z.string().min(1).max(60),
  shortName: z.string().min(1).max(20),
  tagline: z.string().min(1).max(160),
  description: z.string().min(1).max(300),
  /** Canonical origin used for metadata, e.g. "https://example.com" */
  url: url.optional(),
  author: z.object({
    name: z.string().min(1).max(80),
    email: z.string().email().optional(),
    github: z.string().max(80).optional(),
    youtube: url.optional(),
    facebook: url.optional(),
  }),
  donate: z.object({
    intro: z.string().max(400).default(""),
    momo: z
      .object({
        enabled: z.boolean().default(true),
        phone: z.string().regex(/^0\d{9}$/, "số điện thoại MoMo dạng 0xxxxxxxxx"),
        accountName: z.string().min(1).max(80),
        /** Optional deep link / QR payload copied from the MoMo app. Falls back to a text QR with the phone number. */
        qrPayload: z.string().max(500).optional(),
        note: z.string().max(200).optional(),
      })
      .optional(),
    buyMeACoffee: z
      .object({
        enabled: z.boolean().default(true),
        /** Username on buymeacoffee.com */
        username: z.string().min(1).max(60),
        note: z.string().max(200).optional(),
      })
      .optional(),
    crypto: z.array(CryptoWalletSchema).default([]),
    thanks: z.string().max(400).default(""),
  }),
  footer: z.object({
    disclaimer: z.string().max(600).default(""),
    license: z.string().max(120).default(""),
  }),
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

let cached: Promise<SiteConfig> | null = null;

export function getSiteConfig(): Promise<SiteConfig> {
  if (!cached || process.env.NODE_ENV !== "production") {
    cached = (async () => {
      const raw = await fs.readFile(path.join(CONTENT_DIR, "site.json"), "utf8");
      const parsed = SiteConfigSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) throw new Error(`content/site.json không hợp lệ:\n${parsed.error.message}`);
      return parsed.data;
    })();
  }
  return cached;
}

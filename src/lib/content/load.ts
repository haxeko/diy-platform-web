import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  FirmwareManifestSchema,
  GuideFrontmatterSchema,
  ProjectFrontmatterSchema,
  type FirmwareManifest,
  type Guide,
  type Project,
} from "./schema";

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const PROJECTS_DIR = path.join(CONTENT_DIR, "projects");
export const FIRMWARE_DIR = path.join(CONTENT_DIR, "firmware");
export const GUIDES_DIR = path.join(CONTENT_DIR, "guides");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function listFiles(dir: string, ext: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(ext) && !e.name.startsWith("_"))
      .map((e) => e.name)
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

function fail(file: string, err: unknown): never {
  const detail = err instanceof Error ? err.message : String(err);
  throw new Error(`Nội dung không hợp lệ: ${file}\n${detail}`);
}

export async function getProjects(): Promise<Project[]> {
  const files = await listFiles(PROJECTS_DIR, ".md");
  const projects = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.md$/, "");
      if (!SLUG_RE.test(slug)) fail(file, "tên file phải là slug hợp lệ");
      const raw = await fs.readFile(path.join(PROJECTS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const parsed = ProjectFrontmatterSchema.safeParse(data);
      if (!parsed.success) fail(file, parsed.error);
      return { slug, body: content.trim(), ...parsed.data } satisfies Project;
    }),
  );
  return projects.sort((a, b) => Number(b.featured) - Number(a.featured) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(slug: string): Promise<Project | null> {
  if (!SLUG_RE.test(slug)) return null;
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}

export async function getFirmwareManifests(): Promise<FirmwareManifest[]> {
  const files = await listFiles(FIRMWARE_DIR, ".json");
  const manifests = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(FIRMWARE_DIR, file), "utf8");
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (err) {
        fail(file, err);
      }
      const parsed = FirmwareManifestSchema.safeParse(json);
      if (!parsed.success) fail(file, parsed.error);
      if (parsed.data.id !== file.replace(/\.json$/, "")) fail(file, `"id" phải trùng tên file (${parsed.data.id})`);
      return parsed.data;
    }),
  );
  return manifests.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt) || a.name.localeCompare(b.name));
}

export async function getFirmware(id: string): Promise<FirmwareManifest | null> {
  if (!SLUG_RE.test(id)) return null;
  const manifests = await getFirmwareManifests();
  return manifests.find((m) => m.id === id) ?? null;
}

export async function getFirmwareForProject(projectSlug: string): Promise<FirmwareManifest[]> {
  const manifests = await getFirmwareManifests();
  return manifests.filter((m) => m.project === projectSlug);
}

export async function getGuides(): Promise<Guide[]> {
  const files = await listFiles(GUIDES_DIR, ".md");
  const guides = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.md$/, "");
      if (!SLUG_RE.test(slug)) fail(file, "tên file phải là slug hợp lệ");
      const raw = await fs.readFile(path.join(GUIDES_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const parsed = GuideFrontmatterSchema.safeParse(data);
      if (!parsed.success) fail(file, parsed.error);
      return { slug, body: content.trim(), ...parsed.data } satisfies Guide;
    }),
  );
  return guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export async function getGuide(slug: string): Promise<Guide | null> {
  if (!SLUG_RE.test(slug)) return null;
  const guides = await getGuides();
  return guides.find((g) => g.slug === slug) ?? null;
}

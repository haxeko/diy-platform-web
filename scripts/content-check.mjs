#!/usr/bin/env node
/** Cross-checks internal links and references in content/ (projects ↔ firmware ↔ guides). Usage: npm run content:check */
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
const root = process.cwd();
const projects = await fs.readdir(path.join(root, "content/projects"));
const fw = await fs.readdir(path.join(root, "content/firmware"));
const guides = await fs.readdir(path.join(root, "content/guides"));
const fwIds = new Set(fw.map((f) => f.replace(/\.json$/, "")));
const guideSlugs = new Set(guides.map((f) => f.replace(/\.md$/, "")));
const projSlugs = new Set(projects.map((f) => f.replace(/\.md$/, "")));
let bad = 0;
for (const f of projects) {
  const { data, content } = matter(await fs.readFile(path.join(root, "content/projects", f), "utf8"));
  for (const id of data.firmware ?? []) if (!fwIds.has(id)) { console.log(`✗ ${f}: firmware ${id} missing`); bad++; }
  for (const g of data.guides ?? []) if (!guideSlugs.has(g)) { console.log(`✗ ${f}: guide ${g} missing`); bad++; }
  const links = [...content.matchAll(/\]\((\/[^)\s#]+)/g)].map((m) => m[1]);
  for (const l of links) {
    const ok = /^\/(du-an|firmware|huong-dan|ung-ho|bao-ve-firmware)(\/|$)/.test(l);
    if (!ok) { console.log(`✗ ${f}: link ${l}`); bad++; }
    const m = /^\/du-an\/([^/]+)$/.exec(l); if (m && !projSlugs.has(m[1])) { console.log(`✗ ${f}: project link ${l} missing`); bad++; }
    const h = /^\/huong-dan\/([^/]+)$/.exec(l); if (h && !guideSlugs.has(h[1])) { console.log(`✗ ${f}: guide link ${l} missing`); bad++; }
    const w = /^\/firmware\/([^/?]+)$/.exec(l); if (w && !fwIds.has(w[1])) { console.log(`✗ ${f}: firmware link ${l} missing`); bad++; }
  }
  console.log(`✓ ${f} (${links.length} links)`);
}
for (const f of guides) {
  const { content } = matter(await fs.readFile(path.join(root, "content/guides", f), "utf8"));
  const links = [...content.matchAll(/\]\((\/[^)\s#]+)/g)].map((m) => m[1]);
  for (const l of links) {
    const h = /^\/huong-dan\/([^/]+)$/.exec(l); if (h && !guideSlugs.has(h[1])) { console.log(`✗ ${f}: guide link ${l} missing`); bad++; }
    const m = /^\/du-an\/([^/]+)$/.exec(l); if (m && !projSlugs.has(m[1])) { console.log(`✗ ${f}: project link ${l} missing`); bad++; }
    if (!/^\/(du-an|firmware|huong-dan|ung-ho|bao-ve-firmware)(\/|$)/.test(l)) { console.log(`✗ ${f}: link ${l}`); bad++; }
  }
  console.log(`✓ ${f} (${links.length} links)`);
}
for (const f of fw) { const j = JSON.parse(await fs.readFile(path.join(root, "content/firmware", f), "utf8")); if (!projSlugs.has(j.project)) { console.log(`✗ ${f}: project ${j.project} missing`); bad++; } }
console.log(bad ? `${bad} vấn đề` : "Liên kết nội dung OK");

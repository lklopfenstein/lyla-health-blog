import fs from "node:fs";
import path from "node:path";

export type Post = {
  slug: string;
  title: string;
  date: string;
  author: string;
  body: string;
  excerpt: string;
  coverImage?: string;
  source?: string;
  legacyCommentCount?: number;
  pinned?: boolean;
};

const postsDir = path.join(process.cwd(), "content", "posts");

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  const data: Record<string, string | boolean | number> = {};

  for (const line of fm.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (value === "true" || value === "false") {
      data[key] = value === "true";
    } else if (/^-?\d+$/.test(value)) {
      data[key] = Number(value);
    } else {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  return { data, body };
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function imageFromBody(markdown: string) {
  const match = markdown.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match?.[1];
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDir)) return [];

  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
      const { data, body } = parseFrontmatter(raw);
      const slug = file.replace(/\.md$/, "");
      const excerpt = stripMarkdown(body).slice(0, 180);
      return {
        slug,
        title: String(data.title || "Update"),
        date: String(data.date || new Date().toISOString()),
        author: String(data.author || "Lyla Klopfenstein"),
        body,
        excerpt,
        coverImage: String(data.coverImage || imageFromBody(body) || ""),
        source: String(data.source || ""),
        legacyCommentCount: Number(data.legacyCommentCount || data.commentsImported || 0),
        pinned: Boolean(data.pinned)
      };
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export function getPost(slug: string) {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getSiteMeta() {
  const siteFile = path.join(process.cwd(), "content", "site.json");
  if (!fs.existsSync(siteFile)) {
    return { title: "Lyla Klopfenstein", visitsImportedFromPreviousSite: 0 };
  }
  return JSON.parse(fs.readFileSync(siteFile, "utf8")) as {
    title: string;
    visitsImportedFromPreviousSite?: number;
    importedAt?: string;
  };
}

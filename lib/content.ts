import { listFiles, readJson, readText } from "@/lib/store";

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

export async function getAllPosts(): Promise<Post[]> {
  const files = (await listFiles("content/posts")).filter((file) => file.endsWith(".md"));

  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = await readText(`content/posts/${file}`, "");
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
  );

  return posts.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export async function getPost(slug: string) {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug);
}

export async function getSiteMeta() {
  return readJson("content/site.json", {
    title: "Lyla Klopfenstein",
    visitsImportedFromPreviousSite: 0
  }) as Promise<{
    title: string;
    visitsImportedFromPreviousSite?: number;
    importedAt?: string;
  }>;
}

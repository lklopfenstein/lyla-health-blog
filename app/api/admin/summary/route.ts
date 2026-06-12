import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAllPosts } from "@/lib/content";
import { listFiles, readJson, readText } from "@/lib/store";

function frontmatterValue(markdown: string, key: string) {
  const match = markdown.match(new RegExp(`^${key}:\\\\s*(.+)$`, "m"));
  if (!match) return "";
  try {
    return JSON.parse(match[1]);
  } catch {
    return match[1].replace(/^["']|["']$/g, "");
  }
}

async function getDrafts() {
  const storageOptions = { allowBundledFallback: false };
  const files = (await listFiles("content/drafts", storageOptions)).filter((file) => file.endsWith(".md"));
  return Promise.all(
    files.map(async (file) => {
      const markdown = await readText(`content/drafts/${file}`, "", storageOptions);
      const body = markdown.replace(/^---[\s\S]*?\n---\n*/, "").trim();
      return {
        slug: file.replace(/\.md$/, ""),
        title: frontmatterValue(markdown, "title") || "Untitled draft",
        date: frontmatterValue(markdown, "date"),
        coverImage: frontmatterValue(markdown, "coverImage"),
        body
      };
    })
  );
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const storageOptions = { allowBundledFallback: false };
    const subscribers = await readJson("content/subscribers.json", [], storageOptions);
    const pushSubscribers = await readJson("content/push-subscribers.json", [], storageOptions);
    const traffic = await readJson<{
      totalPageViews: number;
      uniqueVisitors: number;
      byPath: Record<string, number>;
      byDay: Record<string, number>;
      recent: Array<{ path: string; at: string; visitorId?: string }>;
    }>("content/traffic.json", {
      totalPageViews: 0,
      uniqueVisitors: 0,
      byPath: {},
      byDay: {},
      recent: []
    }, storageOptions);

    const posts = await getAllPosts(storageOptions);

    return NextResponse.json({
      ok: true,
      subscribers,
      pushSubscribers,
      traffic,
      posts: posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        date: post.date,
        author: post.author,
        body: post.body,
        coverImage: post.coverImage || "",
        commentCount: post.commentCount || 0,
        views: Number(traffic.byPath?.[`/posts/${post.slug}`] || 0),
        source: post.source || "Journal update",
        legacyCommentCount: post.legacyCommentCount || 0,
        pinned: Boolean(post.pinned)
      })),
      drafts: await getDrafts(),
      emailReady: Boolean((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.EMAIL_FROM)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin data.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

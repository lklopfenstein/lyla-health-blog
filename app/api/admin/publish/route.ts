import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readJson, slugify, writeJson, writeText } from "@/lib/store";

type Subscriber = {
  email: string;
  name: string;
};

function markdownFor(input: Record<string, string>) {
  const date = new Date(`${input.date || new Date().toISOString().slice(0, 10)}T12:00:00Z`).toISOString();
  return `---\ntitle: ${JSON.stringify(input.title || "Untitled update")}\ndate: ${JSON.stringify(date)}\nauthor: ${JSON.stringify(input.author || "Lee Klopfenstein")}\nsource: ${JSON.stringify("New update")}\nlegacyCommentCount: 0\npinned: false\ncoverImage: ${JSON.stringify(input.coverImage || "")}\n---\n\n${String(input.body || "").trim()}\n`;
}

async function sendNotifications(post: { title: string; slug: string; excerpt: string; siteUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Lyla Updates <onboarding@resend.dev>";
  if (!apiKey) return { sent: 0, skipped: true };

  const subscribers = await readJson<Subscriber[]>("content/subscribers.json", []);
  let sent = 0;
  for (const subscriber of subscribers) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: subscriber.email,
        subject: `New update: ${post.title}`,
        html: `<p>Hi ${subscriber.name || "there"},</p><p>A new update has been posted.</p><p><strong>${post.title}</strong></p><p>${post.excerpt}</p><p><a href="${post.siteUrl}/posts/${post.slug}">Read the update</a></p>`
      })
    });
    if (res.ok) sent += 1;
  }
  return { sent, skipped: false };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  const kind = input.kind === "draft" ? "draft" : "post";
  const date = String(input.date || new Date().toISOString().slice(0, 10));
  const title = String(input.title || "Untitled update");
  const slug = `${date}-${slugify(title)}`;
  const filePath = kind === "draft" ? `content/drafts/${slug}.md` : `content/posts/${slug}.md`;

  await writeText(filePath, markdownFor(input), `${kind === "draft" ? "Save draft" : "Publish post"}: ${title}`);

  if (kind === "post") {
    await writeJson(`content/comments/${slug}.json`, [], `Create comment thread ${slug}`);
  }

  const email = kind === "post" && input.notify ? await sendNotifications({
    title,
    slug,
    excerpt: String(input.body || "").replace(/\s+/g, " ").slice(0, 180),
    siteUrl: process.env.SITE_URL || new URL(request.url).origin
  }) : { sent: 0, skipped: true };

  return NextResponse.json({ ok: true, slug, email });
}

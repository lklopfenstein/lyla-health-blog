import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteFile, readJson, writeText } from "@/lib/store";

function markdownFor(input: Record<string, unknown>) {
  const date = new Date(`${String(input.date || new Date().toISOString().slice(0, 10))}T12:00:00Z`).toISOString();
  return `---\ntitle: ${JSON.stringify(String(input.title || "Untitled update"))}\ndate: ${JSON.stringify(date)}\nauthor: ${JSON.stringify(String(input.author || "Lee Klopfenstein"))}\nsource: ${JSON.stringify(String(input.source || "Journal update"))}\nlegacyCommentCount: ${Number(input.legacyCommentCount || 0)}\npinned: ${Boolean(input.pinned)}\ncoverImage: ${JSON.stringify(String(input.coverImage || ""))}\n---\n\n${String(input.body || "").trim()}\n`;
}

function cleanSlug(value: unknown) {
  return String(value || "").replace(/[^a-z0-9-]/g, "");
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  const slug = cleanSlug(input.slug);
  if (!slug) {
    return NextResponse.json({ ok: false, message: "Post slug is required." }, { status: 400 });
  }

  await writeText(`content/posts/${slug}.md`, markdownFor(input), `Update post: ${String(input.title || slug)}`);
  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  const slug = cleanSlug(input.slug);
  if (!slug) {
    return NextResponse.json({ ok: false, message: "Post slug is required." }, { status: 400 });
  }

  const comments = await readJson(`content/comments/${slug}.json`, null);
  await deleteFile(`content/posts/${slug}.md`, `Delete post: ${slug}`);
  if (comments !== null) {
    await deleteFile(`content/comments/${slug}.json`, `Delete comments for ${slug}`);
  }
  return NextResponse.json({ ok: true });
}

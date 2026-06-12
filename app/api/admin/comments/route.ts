import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readJson, writeJson } from "@/lib/store";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

function cleanSlug(value: unknown) {
  return String(value || "").replace(/[^a-z0-9-]/g, "");
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  const slug = cleanSlug(input.slug);
  const commentId = String(input.commentId || "");
  if (!slug || !commentId) {
    return NextResponse.json({ ok: false, message: "Post and comment are required." }, { status: 400 });
  }

  const comments = await readJson<Comment[]>(`content/comments/${slug}.json`, []);
  const nextComments = comments.filter((comment) => comment.id !== commentId);
  await writeJson(`content/comments/${slug}.json`, nextComments, `Delete comment on ${slug}`);
  return NextResponse.json({ ok: true, comments: nextComments });
}

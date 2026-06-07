import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

type Params = {
  params: Promise<{ slug: string }>;
};

function clean(value: string, max: number) {
  return value.replace(/[<>]/g, "").trim().slice(0, max);
}

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const comments = await readJson<Comment[]>(`content/comments/${slug}.json`, []);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const name = clean(String(body.name || ""), 80);
  const commentBody = clean(String(body.body || ""), 1800);

  if (!name || !commentBody) {
    return NextResponse.json({ ok: false, message: "Name and comment are required." }, { status: 400 });
  }

  const comments = await readJson<Comment[]>(`content/comments/${slug}.json`, []);
  comments.push({
    id: crypto.randomUUID(),
    name,
    body: commentBody,
    createdAt: new Date().toISOString()
  });

  await writeJson(`content/comments/${slug}.json`, comments, `Add comment on ${slug}`);
  return NextResponse.json({ ok: true, comments });
}

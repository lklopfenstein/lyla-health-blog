import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteFile } from "@/lib/store";

function cleanSlug(value: unknown) {
  return String(value || "").replace(/[^a-z0-9-]/g, "");
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  const slug = cleanSlug(input.slug);
  if (!slug) {
    return NextResponse.json({ ok: false, message: "Draft slug is required." }, { status: 400 });
  }

  await deleteFile(`content/drafts/${slug}.md`, `Delete draft: ${slug}`);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { slugify, writeBase64 } from "@/lib/store";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  const name = String(input.name || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  const content = String(input.content || "");
  const ext = name.includes(".") ? name.split(".").pop() : "jpg";
  const baseName = slugify(name.replace(/\.[^.]+$/, ""));
  const filePath = `public/uploads/${Date.now()}-${baseName}.${ext}`;

  if (!content) {
    return NextResponse.json({ ok: false, message: "Image content is required." }, { status: 400 });
  }

  await writeBase64(filePath, content, `Upload image ${name}`);
  return NextResponse.json({ ok: true, path: `/${filePath.replace(/^public\//, "")}` });
}

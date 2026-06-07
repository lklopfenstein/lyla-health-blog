import { NextResponse } from "next/server";
import { setAdminCookie, validPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (!validPassword(String(password || ""))) {
    return NextResponse.json({ ok: false, message: "Invalid password" }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}

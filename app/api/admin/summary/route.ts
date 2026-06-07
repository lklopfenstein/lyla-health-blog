import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAllPosts } from "@/lib/content";
import { readJson } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const subscribers = await readJson("content/subscribers.json", []);
  const traffic = await readJson("content/traffic.json", {
    totalPageViews: 0,
    uniqueVisitors: 0,
    byPath: {},
    byDay: {},
    recent: []
  });

  return NextResponse.json({
    ok: true,
    subscribers,
    traffic,
    posts: getAllPosts().map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date
    })),
    emailReady: Boolean(process.env.RESEND_API_KEY)
  });
}

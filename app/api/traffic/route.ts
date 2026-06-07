import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";

type Traffic = {
  totalPageViews: number;
  uniqueVisitors: number;
  byPath: Record<string, number>;
  byDay: Record<string, number>;
  recent: Array<{ path: string; at: string; visitorId: string }>;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const pagePath = String(body.path || "/").slice(0, 180);
  const visitorId = String(body.visitorId || "").slice(0, 120);
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const traffic = await readJson<Traffic>("content/traffic.json", {
    totalPageViews: 0,
    uniqueVisitors: 0,
    byPath: {},
    byDay: {},
    recent: []
  });

  traffic.totalPageViews += 1;
  traffic.byPath[pagePath] = (traffic.byPath[pagePath] || 0) + 1;
  traffic.byDay[day] = (traffic.byDay[day] || 0) + 1;
  if (visitorId && !traffic.recent.some((visit) => visit.visitorId === visitorId)) {
    traffic.uniqueVisitors += 1;
  }
  traffic.recent = [{ path: pagePath, at: now.toISOString(), visitorId }, ...traffic.recent].slice(0, 80);

  await writeJson("content/traffic.json", traffic, `Track visit ${day}`);
  return NextResponse.json({ ok: true });
}

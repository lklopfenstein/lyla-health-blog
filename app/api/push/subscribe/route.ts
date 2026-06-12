import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";

type PushSubscriptionRecord = {
  endpoint: string;
  subscription: unknown;
  createdAt: string;
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
  });
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  const subscription = input.subscription;
  const endpoint = String(subscription?.endpoint || "");
  if (!endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ ok: false, message: "Notification subscription is incomplete." }, { status: 400 });
  }

  const subscriptions = await readJson<PushSubscriptionRecord[]>("content/push-subscribers.json", []);
  const next = subscriptions.filter((item) => item.endpoint !== endpoint);
  next.push({ endpoint, subscription, createdAt: new Date().toISOString() });
  next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  await writeJson("content/push-subscribers.json", next, "Subscribe to browser notifications");
  return NextResponse.json({ ok: true, count: next.length });
}

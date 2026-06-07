import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";

type Subscriber = {
  email: string;
  name: string;
  createdAt: string;
};

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();

  if (!validEmail(email)) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  }

  const subscribers = await readJson<Subscriber[]>("content/subscribers.json", []);
  const existing = subscribers.find((subscriber) => subscriber.email === email);
  if (existing) {
    existing.name = name || existing.name;
  } else {
    subscribers.push({ email, name, createdAt: new Date().toISOString() });
  }
  subscribers.sort((a, b) => a.email.localeCompare(b.email));

  await writeJson("content/subscribers.json", subscribers, `Subscribe ${email}`);
  return NextResponse.json({ ok: true, count: subscribers.length });
}

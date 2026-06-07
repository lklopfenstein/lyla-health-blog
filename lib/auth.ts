import crypto from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "lyla_admin";

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "local-dev-secret";
}

export function signSession() {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const payload = `admin.${expires}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(value?: string) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [role, expires, sig] = parts;
  if (role !== "admin" || Number(expires) < Date.now()) return false;
  const payload = `${role}.${expires}`;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function isAdmin() {
  const jar = await cookies();
  return verifySession(jar.get(cookieName)?.value);
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(cookieName, signSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export function validPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  if (Buffer.byteLength(password) !== Buffer.byteLength(configured)) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(configured));
}

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const IMAGE_DIR = path.join(process.cwd(), "public", "archive-images");
const REMOTE_IMAGE_RE = /https:\/\/assets\.caringbridge\.org\/[^\s")]+/g;

function extensionFromContentType(contentType = "") {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function fileBase(url) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status} ${url}`);
  const ext = extensionFromContentType(res.headers.get("content-type") || "");
  const fileName = `${fileBase(url)}.${ext}`;
  const target = path.join(IMAGE_DIR, fileName);
  await fs.writeFile(target, Buffer.from(await res.arrayBuffer()));
  return `/archive-images/${fileName}`;
}

async function main() {
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const files = (await fs.readdir(POSTS_DIR)).filter((file) => file.endsWith(".md"));
  const replacements = new Map();

  for (const file of files) {
    const fullPath = path.join(POSTS_DIR, file);
    const raw = await fs.readFile(fullPath, "utf8");
    const urls = [...new Set(raw.match(REMOTE_IMAGE_RE) || [])];
    let next = raw;

    for (const url of urls) {
      if (!replacements.has(url)) {
        replacements.set(url, await download(url));
        console.log(`Localized ${replacements.size} image(s)`);
      }
      next = next.replaceAll(url, replacements.get(url));
    }

    if (next !== raw) await fs.writeFile(fullPath, next);
  }

  console.log(`Localized ${replacements.size} archive image(s) into ${IMAGE_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

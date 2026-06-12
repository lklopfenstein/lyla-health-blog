import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const repo = process.env.CONTENT_REPO || process.env.NEXT_PUBLIC_GITHUB_REPO || "lklopfenstein/lyla-health-blog";
const branch = process.env.CONTENT_BRANCH || "main";
const token = process.env.CONTENT_TOKEN || process.env.GITHUB_TOKEN || "";

type GitFile = {
  content: string;
  encoding: string;
  sha: string;
};

type GitDirectoryItem = {
  name: string;
  path: string;
  type: string;
};

function localPath(filePath: string) {
  const target = path.normalize(path.join(root, filePath));
  const contentRoot = path.join(root, "content");
  const uploadRoot = path.join(root, "public", "uploads");
  if (!target.startsWith(contentRoot) && !target.startsWith(uploadRoot)) {
    throw new Error("Unsupported storage path");
  }
  return target;
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf8");
}

async function getGitFile(filePath: string): Promise<GitFile | null> {
  if (!token) return null;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    },
    cache: "no-store"
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Unable to read ${filePath}`);
  return res.json();
}

export async function listFiles(dirPath: string) {
  if (token) {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${dirPath}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      },
      cache: "no-store"
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Unable to list ${dirPath}`);
    const items = (await res.json()) as GitDirectoryItem[];
    return items.filter((item) => item.type === "file").map((item) => item.name);
  }

  try {
    return await fs.readdir(localPath(dirPath));
  } catch {
    return [];
  }
}

export async function readText(filePath: string, fallback = "") {
  const gitFile = await getGitFile(filePath);
  if (gitFile?.content) return decodeBase64(gitFile.content);
  try {
    return await fs.readFile(localPath(filePath), "utf8");
  } catch {
    return fallback;
  }
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readText(filePath, JSON.stringify(fallback))) as T;
  } catch {
    return fallback;
  }
}

export async function writeText(filePath: string, content: string, message: string) {
  if (!token) {
    await fs.mkdir(path.dirname(localPath(filePath)), { recursive: true });
    await fs.writeFile(localPath(filePath), content);
    return;
  }

  const existing = await getGitFile(filePath);
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      branch,
      message,
      content: encodeBase64(content),
      sha: existing?.sha
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Unable to write ${filePath}`);
  }
}

export async function writeBase64(filePath: string, content: string, message: string) {
  if (!token) {
    await fs.mkdir(path.dirname(localPath(filePath)), { recursive: true });
    await fs.writeFile(localPath(filePath), Buffer.from(content, "base64"));
    return;
  }

  const existing = await getGitFile(filePath);
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      branch,
      message,
      content,
      sha: existing?.sha
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Unable to write ${filePath}`);
  }
}

export async function writeJson(filePath: string, value: unknown, message: string) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`, message);
}

export async function deleteFile(filePath: string, message: string) {
  if (!token) {
    await fs.rm(localPath(filePath), { force: true });
    return;
  }

  const existing = await getGitFile(filePath);
  if (!existing) return;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      branch,
      message,
      sha: existing.sha
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Unable to delete ${filePath}`);
  }
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "update"
  );
}

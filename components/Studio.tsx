"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { FileText, ImagePlus, KeyRound, Save, Send, Trash2 } from "lucide-react";

type Draft = {
  title: string;
  date: string;
  body: string;
  coverImage: string;
  author: string;
};

const emptyDraft: Draft = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  body: "",
  coverImage: "",
  author: "Lyla Klopfenstein"
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "update"
  );
}

function markdownFor(draft: Draft) {
  const date = new Date(`${draft.date}T12:00:00`).toISOString();
  return `---\ntitle: ${JSON.stringify(draft.title || "Untitled update")}\ndate: ${JSON.stringify(date)}\nauthor: ${JSON.stringify(draft.author || "Lyla Klopfenstein")}\nsource: \"New site\"\ncommentsImported: 0\npinned: false\ncoverImage: ${JSON.stringify(draft.coverImage || "")}\n---\n\n${draft.body.trim()}\n`;
}

async function githubPutFile({
  repo,
  token,
  filePath,
  content,
  message
}: {
  repo: string;
  token: string;
  filePath: string;
  content: string;
  message: string;
}) {
  const current = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  const existing = current.ok ? await current.json() : undefined;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: existing?.sha
    })
  });
  if (!res.ok) throw new Error((await res.json()).message || "GitHub save failed");
  return res.json();
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  new Uint8Array(buffer).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function Studio() {
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || "";
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lyla-studio-draft");
    const savedToken = localStorage.getItem("lyla-github-token");
    if (saved) setDraft(JSON.parse(saved));
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    localStorage.setItem("lyla-studio-draft", JSON.stringify(draft));
  }, [draft]);

  const slug = useMemo(() => `${draft.date}-${slugify(draft.title || "untitled-update")}`, [draft.date, draft.title]);

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(kind: "draft" | "publish") {
    if (!repo) {
      setStatus("Set NEXT_PUBLIC_GITHUB_REPO in Vercel first, using owner/repo.");
      return;
    }
    if (!token) {
      setStatus("Paste a fine-grained GitHub token with Contents: Read and write.");
      return;
    }
    setBusy(true);
    setStatus("Saving to GitHub...");
    try {
      localStorage.setItem("lyla-github-token", token);
      const filePath = kind === "draft" ? `content/drafts/${slug}.md` : `content/posts/${slug}.md`;
      await githubPutFile({
        repo,
        token,
        filePath,
        content: markdownFor(draft),
        message: `${kind === "draft" ? "Save draft" : "Publish post"}: ${draft.title || "Untitled update"}`
      });
      setStatus(kind === "draft" ? "Draft saved to GitHub." : "Published. Vercel will rebuild from the GitHub commit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file || !repo || !token) {
      setStatus("Choose an image after setting the repo and token.");
      return;
    }
    setBusy(true);
    setStatus("Uploading image...");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const imagePath = `public/uploads/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
      const content = await fileToBase64(file);
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${imagePath}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: `Upload image: ${file.name}`, content })
      });
      if (!res.ok) throw new Error((await res.json()).message || "Image upload failed");
      const publicPath = `/${imagePath.replace(/^public\//, "")}`;
      update("body", `${draft.body.trim()}\n\n![${file.name}](${publicPath})`.trim());
      if (!draft.coverImage) update("coverImage", publicPath);
      setStatus("Image uploaded and inserted into the post.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setBusy(false);
      event.currentTarget.value = "";
    }
  }

  return (
    <section className="studio">
      <p className="eyebrow">Author studio</p>
      <h1>Write once. Keep it forever.</h1>
      <div className="studio-grid">
        <aside className="panel">
          <h2>
            <KeyRound size={22} aria-hidden /> Setup
          </h2>
          <p className="notice">
            Create a fine-grained GitHub token for this repo with Contents read/write. It stays in this browser and is never sent anywhere except
            GitHub.
          </p>
          <label className="field">
            GitHub repo
            <input value={repo || "Set NEXT_PUBLIC_GITHUB_REPO in Vercel"} readOnly />
          </label>
          <label className="field">
            GitHub token
            <input value={token} type="password" onChange={(event) => setToken(event.target.value)} placeholder="github_pat_..." />
          </label>
          <label className="button">
            <ImagePlus size={17} aria-hidden />
            Add image
            <input className="sr-only" type="file" accept="image/*" onChange={uploadImage} />
          </label>
          <div className="studio-actions">
            <button className="button ghost" type="button" onClick={() => setDraft(emptyDraft)}>
              <Trash2 size={17} aria-hidden /> New
            </button>
          </div>
          {status ? <p className="notice">{status}</p> : null}
        </aside>
        <div className="panel">
          <h2>
            <FileText size={22} aria-hidden /> Post
          </h2>
          <label className="field">
            Title
            <input value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="A clear title for the update" />
          </label>
          <label className="field">
            Date
            <input value={draft.date} onChange={(event) => update("date", event.target.value)} type="date" />
          </label>
          <label className="field">
            Cover image URL
            <input value={draft.coverImage} onChange={(event) => update("coverImage", event.target.value)} placeholder="/uploads/photo.jpg" />
          </label>
          <label className="field">
            Body
            <textarea
              value={draft.body}
              onChange={(event) => update("body", event.target.value)}
              placeholder="Write the update here. Use Markdown for links and photos."
            />
          </label>
          <div className="studio-actions">
            <button className="button" type="button" disabled={busy} onClick={() => save("draft")}>
              <Save size={17} aria-hidden /> Save draft
            </button>
            <button className="button primary" type="button" disabled={busy} onClick={() => save("publish")}>
              <Send size={17} aria-hidden /> Publish
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

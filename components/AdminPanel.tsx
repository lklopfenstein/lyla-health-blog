"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { BarChart3, FileText, ImagePlus, LockKeyhole, LogOut, Mail, Save, Send, Users } from "lucide-react";

type Summary = {
  subscribers: Array<{ email: string; name: string; createdAt: string }>;
  traffic: {
    totalPageViews: number;
    uniqueVisitors: number;
    byPath: Record<string, number>;
    byDay: Record<string, number>;
    recent: Array<{ path: string; at: string }>;
  };
  posts: Array<{ slug: string; title: string; date: string }>;
  drafts: Array<{ slug: string; title: string; date: string; body: string; coverImage: string }>;
  emailReady: boolean;
};

const emptyPost = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  author: "Lee Klopfenstein",
  coverImage: "",
  body: "",
  notify: true
};

async function toBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  new Uint8Array(buffer).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [post, setPost] = useState(emptyPost);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSummary() {
    const res = await fetch("/api/admin/summary", { cache: "no-store" });
    if (res.ok) {
      setAuthenticated(true);
      setSummary(await res.json());
    } else {
      setAuthenticated(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setBusy(false);
    if (!res.ok) {
      setStatus("That password did not work.");
      return;
    }
    setPassword("");
    setStatus("");
    await loadSummary();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  }

  async function save(kind: "draft" | "post") {
    setBusy(true);
    setStatus(kind === "draft" ? "Saving draft..." : "Publishing...");
    const res = await fetch("/api/admin/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...post, kind })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.message || "Could not save.");
      return;
    }
    setStatus(kind === "draft" ? "Draft saved." : data.email?.skipped ? "Published. Email sending is not connected yet." : `Published and emailed ${data.email.sent} subscriber(s).`);
    if (kind === "post") setPost(emptyPost);
    await loadSummary();
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files || [])];
    if (!files.length) return;
    setBusy(true);
    setStatus(files.length === 1 ? "Uploading media..." : `Uploading ${files.length} files...`);
    const inserts: string[] = [];
    let firstImage = "";
    for (const file of files) {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, content: await toBase64(file) })
      });
      const data = await res.json();
      if (!res.ok) {
        setBusy(false);
        setStatus(data.message || "Media upload failed.");
        event.currentTarget.value = "";
        return;
      }
      if (file.type.startsWith("video/")) {
        inserts.push(`[Video: ${file.name}](${data.path})`);
      } else {
        inserts.push(`![${file.name}](${data.path})`);
        if (!firstImage) firstImage = data.path;
      }
    }
    setBusy(false);
    event.currentTarget.value = "";
    setPost((current) => ({
      ...current,
      coverImage: current.coverImage || firstImage,
      body: `${current.body.trim()}\n\n${inserts.join("\n\n")}`.trim()
    }));
    setStatus(files.length === 1 ? "Media inserted." : "Media inserted.");
  }

  function loadDraft(draft: Summary["drafts"][number]) {
    setPost({
      title: draft.title,
      date: draft.date ? new Date(draft.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      author: "Lee Klopfenstein",
      coverImage: draft.coverImage || "",
      body: draft.body || "",
      notify: true
    });
    setStatus(`Loaded draft: ${draft.title}`);
  }

  if (!authenticated) {
    return (
      <section className="studio admin-login">
        <p className="eyebrow">Private admin</p>
        <h1>Sign in to manage the journal</h1>
        <form className="panel login-panel" onSubmit={login}>
          <LockKeyhole size={26} aria-hidden />
          <label className="field">
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          <button className="button primary" disabled={busy} type="submit">
            Sign in
          </button>
          {status ? <p className="form-status">{status}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <section className="studio">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Private admin</p>
          <h1>Write an update</h1>
        </div>
        <button className="button" type="button" onClick={logout}>
          <LogOut size={17} aria-hidden /> Sign out
        </button>
      </div>

      <div className="admin-metrics">
        <div className="stat">
          <strong>{summary?.traffic.totalPageViews || 0}</strong>
          <span>tracked page views</span>
        </div>
        <div className="stat">
          <strong>{summary?.traffic.uniqueVisitors || 0}</strong>
          <span>known visitors</span>
        </div>
        <div className="stat">
          <strong>{summary?.subscribers.length || 0}</strong>
          <span>email subscribers</span>
        </div>
      </div>

      <div className="writer-shell">
        <div className="panel writer-panel">
          <label className="field title-field">
            Title
            <input value={post.title} onChange={(event) => setPost({ ...post, title: event.target.value })} placeholder="Give this update a title" />
          </label>
          <label className="field">
            Post
            <textarea value={post.body} onChange={(event) => setPost({ ...post, body: event.target.value })} placeholder="Write the update here..." />
          </label>
          <div className="studio-actions writer-actions">
            <label className="button image-button">
              <ImagePlus size={17} aria-hidden /> Add pictures/videos
              <input className="sr-only" type="file" accept="image/*,video/*" multiple onChange={uploadMedia} />
            </label>
            <button className="button" disabled={busy} type="button" onClick={() => save("draft")}>
              <Save size={17} aria-hidden /> Save draft
            </button>
            <button className="button primary" disabled={busy} type="button" onClick={() => save("post")}>
              <Send size={17} aria-hidden /> Publish
            </button>
          </div>
          <label className="field checkbox-field notify-field">
            <input checked={post.notify} onChange={(event) => setPost({ ...post, notify: event.target.checked })} type="checkbox" />
            Email subscribers when this is published
          </label>
          {status ? <p className="form-status">{status}</p> : null}
        </div>
      </div>

      <div className="studio-grid">
        <aside className="panel">
          <h2>
            <FileText size={22} aria-hidden /> Drafts
          </h2>
          <div className="draft-list">
            {summary?.drafts.length ? (
              summary.drafts.map((draft) => (
                <button key={draft.slug} type="button" onClick={() => loadDraft(draft)}>
                  <strong>{draft.title}</strong>
                  <span>{draft.body.slice(0, 120) || "No body yet"}</span>
                </button>
              ))
            ) : (
              <p className="empty-note">No saved drafts yet.</p>
            )}
          </div>
          <h2>
            <Users size={22} aria-hidden /> Subscribers
          </h2>
          <div className="subscriber-list">
            {summary?.subscribers.map((subscriber) => (
              <div key={subscriber.email}>
                <strong>{subscriber.name || "Unnamed"}</strong>
                <span>{subscriber.email}</span>
              </div>
            ))}
          </div>
          <h2>
            <BarChart3 size={22} aria-hidden /> Top pages
          </h2>
          <div className="traffic-list">
            {Object.entries(summary?.traffic.byPath || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([path, count]) => (
                <div key={path}>
                  <span>{path}</span>
                  <strong>{count}</strong>
                </div>
              ))}
          </div>
          <p className="notice">
            <Mail size={16} aria-hidden /> {summary?.emailReady ? "Email notifications are connected." : "Email notifications are wired, but an email key is not connected yet."}
          </p>
        </aside>
      </div>
    </section>
  );
}

"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { BarChart3, Bold, FileText, ImagePlus, Italic, Link as LinkIcon, List, LockKeyhole, LogOut, Mail, MessageCircle, Music, Pencil, Save, Send, Trash2, Underline, Users } from "lucide-react";
import { Markdown } from "@/components/Markdown";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

type EditablePost = {
  slug: string;
  title: string;
  date: string;
  author: string;
  body: string;
  coverImage: string;
  commentCount: number;
  views: number;
  source: string;
  legacyCommentCount: number;
  pinned: boolean;
};

type Summary = {
  subscribers: Array<{ email: string; name: string; createdAt: string }>;
  pushSubscribers: Array<{ endpoint: string; createdAt: string }>;
  traffic: {
    totalPageViews: number;
    uniqueVisitors: number;
    byPath: Record<string, number>;
    byDay: Record<string, number>;
    recent: Array<{ path: string; at: string }>;
  };
  posts: EditablePost[];
  drafts: Array<{ slug: string; title: string; date: string; body: string; coverImage: string }>;
  emailReady: boolean;
};

type MediaItem = {
  id: string;
  name: string;
  previewUrl: string;
  type: "image" | "video";
  status: "uploading" | "ready" | "failed";
};

function createEmptyPost() {
  return {
    title: "",
    date: new Date().toISOString().slice(0, 10),
    author: "Lee Klopfenstein",
    coverImage: "",
    body: "",
    source: "New update",
    legacyCommentCount: 0,
    pinned: false,
    notify: true
  };
}

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
  const [post, setPost] = useState(createEmptyPost);
  const [editingSlug, setEditingSlug] = useState("");
  const [selectedCommentsSlug, setSelectedCommentsSlug] = useState("");
  const [selectedComments, setSelectedComments] = useState<Comment[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [commentStatus, setCommentStatus] = useState("");
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
    const title = post.title.trim();
    const body = post.body.trim();
    if (!title) {
      setStatus("Please add a title before saving.");
      return;
    }
    if (kind === "post" && !body) {
      setStatus("Please write something before publishing.");
      return;
    }

    setBusy(true);
    setStatus(editingSlug && kind === "post" ? "Saving changes..." : kind === "draft" ? "Saving draft..." : "Publishing...");
    const isEditingPost = Boolean(editingSlug && kind === "post");
    const payload = { ...post, title, body };
    const res = await fetch(isEditingPost ? "/api/admin/posts" : "/api/admin/publish", {
      method: isEditingPost ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditingPost ? { ...payload, slug: editingSlug } : { ...payload, kind })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.message || "Could not save.");
      return;
    }
    if (isEditingPost) {
      setStatus("Post updated.");
      setEditingSlug("");
      setPost(createEmptyPost());
      setMediaItems([]);
    } else {
      if (kind === "draft") {
        setStatus("Draft saved.");
      } else if (data.email?.skipped) {
        setStatus("Published. Email sending is not connected yet.");
      } else if (data.email?.failed) {
        setStatus(`Published and emailed ${data.email.sent} subscriber(s). ${data.email.failed} email(s) failed.`);
      } else {
        setStatus(`Published and emailed ${data.email?.sent || 0} subscriber(s).`);
      }
      if (kind === "post") {
        setPost(createEmptyPost());
        setMediaItems([]);
      }
    }
    await loadSummary();
  }

  async function deletePost(slug: string, title: string) {
    const confirmed = window.confirm(`Delete "${title}" and its comments? This cannot be undone from the admin screen.`);
    if (!confirmed) return;
    setBusy(true);
    setStatus("Deleting post...");
    const res = await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.message || "Could not delete post.");
      return;
    }
    if (editingSlug === slug) {
      setEditingSlug("");
      setPost(createEmptyPost());
      setMediaItems([]);
    }
    if (selectedCommentsSlug === slug) {
      setSelectedCommentsSlug("");
      setSelectedComments([]);
    }
    setStatus("Post deleted.");
    await loadSummary();
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files || [])];
    if (!files.length) return;
    setBusy(true);
    setStatus(files.length === 1 ? "Uploading media..." : `Uploading ${files.length} files...`);
    const staged = files.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" as const : "image" as const,
      status: "uploading" as const
    }));
    setMediaItems((current) => [...staged, ...current]);

    for (const file of files) {
      const item = staged.find((candidate) => candidate.name === file.name);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, content: await toBase64(file) })
      });
      const data = await res.json();
      if (!res.ok) {
        if (item) {
          setMediaItems((current) => current.map((media) => media.id === item.id ? { ...media, status: "failed" } : media));
        }
        setStatus(data.message || "Media upload failed.");
        continue;
      }
      if (item) {
        setMediaItems((current) => current.map((media) => media.id === item.id ? { ...media, status: "ready" } : media));
      }
      const isVideo = file.type.startsWith("video/");
      const insert = isVideo ? `[Video: ${file.name}](${data.path})` : `![${file.name}](${data.path})`;
      setPost((current) => ({
        ...current,
        coverImage: current.coverImage || (isVideo ? "" : data.path),
        body: `${current.body.trim()}\n\n${insert}`.trim()
      }));
    }
    setBusy(false);
    event.currentTarget.value = "";
    setStatus(files.length === 1 ? "Media inserted." : "Media inserted.");
  }

  function loadDraft(draft: Summary["drafts"][number]) {
    setPost({
      title: draft.title,
      date: draft.date ? new Date(draft.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      author: "Lee Klopfenstein",
      coverImage: draft.coverImage || "",
      body: draft.body || "",
      source: "New update",
      legacyCommentCount: 0,
      pinned: false,
      notify: true
    });
    setEditingSlug("");
    setMediaItems([]);
    setStatus(`Loaded draft: ${draft.title}`);
  }

  function editPublishedPost(item: EditablePost) {
    setPost({
      title: item.title,
      date: item.date ? new Date(item.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      author: item.author || "Lee Klopfenstein",
      coverImage: item.coverImage || "",
      body: item.body || "",
      source: item.source || "Journal update",
      legacyCommentCount: item.legacyCommentCount || 0,
      pinned: Boolean(item.pinned),
      notify: false
    });
    setEditingSlug(item.slug);
    setMediaItems([]);
    setStatus(`Editing: ${item.title}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newPost() {
    setEditingSlug("");
    setPost(createEmptyPost());
    setMediaItems([]);
    setStatus("Ready for a new post.");
  }

  function insertSpotifyLink() {
    const url = spotifyUrl.trim();
    if (!url) {
      setStatus("Paste a Spotify link first.");
      return;
    }
    if (!/^https:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\//.test(url)) {
      setStatus("That does not look like a Spotify song, album, playlist, episode, or show link.");
      return;
    }
    setPost((current) => ({
      ...current,
      body: `${current.body.trim()}\n\n${url}`.trim()
    }));
    setSpotifyUrl("");
    setStatus("Spotify link inserted.");
  }

  function formatSelection(prefix: string, suffix = prefix, placeholder = "text") {
    const textarea = document.getElementById("post-body") as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? post.body.length;
    const end = textarea?.selectionEnd ?? post.body.length;
    const selected = post.body.slice(start, end) || placeholder;
    const nextBody = `${post.body.slice(0, start)}${prefix}${selected}${suffix}${post.body.slice(end)}`;
    setPost((current) => ({ ...current, body: nextBody }));
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + selected.length;
      textarea?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function formatBullets() {
    const textarea = document.getElementById("post-body") as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? post.body.length;
    const end = textarea?.selectionEnd ?? post.body.length;
    const selected = post.body.slice(start, end) || "First item\nSecond item";
    const bulleted = selected
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.startsWith("- ") ? line : `- ${line}`)
      .join("\n");
    const nextBody = `${post.body.slice(0, start)}${bulleted}${post.body.slice(end)}`;
    setPost((current) => ({ ...current, body: nextBody }));
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start, start + bulleted.length);
    });
  }

  function formatLink() {
    const textarea = document.getElementById("post-body") as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? post.body.length;
    const end = textarea?.selectionEnd ?? post.body.length;
    const selected = post.body.slice(start, end) || "link text";
    const next = `[${selected}](https://example.com)`;
    const nextBody = `${post.body.slice(0, start)}${next}${post.body.slice(end)}`;
    setPost((current) => ({ ...current, body: nextBody }));
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const urlStart = start + selected.length + 3;
      textarea?.setSelectionRange(urlStart, urlStart + "https://example.com".length);
    });
  }

  async function deleteDraft(slug: string, title: string) {
    const confirmed = window.confirm(`Delete draft "${title}"?`);
    if (!confirmed) return;
    setBusy(true);
    setStatus("Deleting draft...");
    const res = await fetch("/api/admin/drafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.message || "Could not delete draft.");
      return;
    }
    setStatus("Draft deleted.");
    await loadSummary();
  }

  async function loadComments(slug: string) {
    setCommentStatus("Loading comments...");
    const res = await fetch(`/api/comments/${slug}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setCommentStatus(data.message || "Could not load comments.");
      return;
    }
    setSelectedCommentsSlug(slug);
    setSelectedComments(data.comments || []);
    setCommentStatus("");
  }

  async function deleteComment(commentId: string) {
    if (!selectedCommentsSlug) return;
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;
    setCommentStatus("Deleting comment...");
    const res = await fetch("/api/admin/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: selectedCommentsSlug, commentId })
    });
    const data = await res.json();
    if (!res.ok) {
      setCommentStatus(data.message || "Could not delete comment.");
      return;
    }
    setSelectedComments(data.comments || []);
    setCommentStatus("Comment deleted.");
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
          <h1>{editingSlug ? "Edit this update" : "Write an update"}</h1>
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
        <div className="stat">
          <strong>{summary?.pushSubscribers.length || 0}</strong>
          <span>browser notification subscribers</span>
        </div>
      </div>

      <div className="writer-shell">
        <div className="panel writer-panel">
          {editingSlug ? (
            <div className="notice">
              <Pencil size={16} aria-hidden /> Editing a published post. Save changes will update the live post without emailing subscribers.
            </div>
          ) : null}
          <label className="field title-field">
            Title
            <input value={post.title} onChange={(event) => setPost({ ...post, title: event.target.value })} placeholder="Give this update a title" />
          </label>
          <label className="field">
            Post
            <div className="format-toolbar" aria-label="Text formatting">
              <button type="button" title="Bold" onClick={() => formatSelection("**", "**", "bold text")}>
                <Bold size={16} aria-hidden />
              </button>
              <button type="button" title="Italic" onClick={() => formatSelection("_", "_", "italic text")}>
                <Italic size={16} aria-hidden />
              </button>
              <button type="button" title="Underline" onClick={() => formatSelection("<u>", "</u>", "underlined text")}>
                <Underline size={16} aria-hidden />
              </button>
              <button type="button" title="Bulleted list" onClick={formatBullets}>
                <List size={16} aria-hidden />
              </button>
              <button type="button" title="Link" onClick={formatLink}>
                <LinkIcon size={16} aria-hidden />
              </button>
            </div>
            <textarea id="post-body" value={post.body} onChange={(event) => setPost({ ...post, body: event.target.value })} placeholder="Write the update here..." />
          </label>
          <label className="field spotify-field">
            Spotify song or playlist link
            <div className="inline-field">
              <input
                value={spotifyUrl}
                onChange={(event) => setSpotifyUrl(event.target.value)}
                placeholder="Paste a Spotify link here"
                type="url"
              />
              <button className="button" type="button" onClick={insertSpotifyLink}>
                <Music size={17} aria-hidden /> Insert
              </button>
            </div>
          </label>
          {post.body.trim() ? (
            <div className="writer-preview">
              <div className="preview-label">Preview</div>
              <Markdown body={post.body} />
            </div>
          ) : null}
          <div className="studio-actions writer-actions">
            <label className="button image-button">
              <ImagePlus size={17} aria-hidden /> Add pictures/videos
              <input className="sr-only" type="file" accept="image/*,video/*" multiple onChange={uploadMedia} />
            </label>
            <button className="button" disabled={busy} type="button" onClick={() => save("draft")}>
              <Save size={17} aria-hidden /> Save draft
            </button>
            <button className="button primary" disabled={busy} type="button" onClick={() => save("post")}>
              <Send size={17} aria-hidden /> {editingSlug ? "Save changes" : "Publish"}
            </button>
            {editingSlug ? (
              <button className="button" disabled={busy} type="button" onClick={newPost}>
                New post
              </button>
            ) : null}
          </div>
          {mediaItems.length ? (
            <div className="staged-media-grid" aria-label="Uploaded media">
              {mediaItems.map((item) => (
                <div className="staged-media" key={item.id}>
                  {item.type === "video" ? <video src={item.previewUrl} controls /> : <img src={item.previewUrl} alt="" />}
                  <span>{item.status === "uploading" ? "Uploading..." : item.status === "failed" ? "Upload failed" : "Inserted"}</span>
                </div>
              ))}
            </div>
          ) : null}
          {!editingSlug ? (
            <label className="field checkbox-field notify-field">
              <input checked={post.notify} onChange={(event) => setPost({ ...post, notify: event.target.checked })} type="checkbox" />
              Email subscribers when this is published
            </label>
          ) : null}
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
                <div key={draft.slug} className="draft-item">
                  <button type="button" onClick={() => loadDraft(draft)}>
                    <strong>{draft.title}</strong>
                    <span>{draft.body.slice(0, 120) || "No body yet"}</span>
                  </button>
                  <button className="icon-action danger" type="button" title="Delete draft" onClick={() => deleteDraft(draft.slug, draft.title)}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              ))
            ) : (
            <p className="empty-note">No saved drafts yet.</p>
          )}
          </div>
          <h2>
            <Pencil size={22} aria-hidden /> Published posts
          </h2>
          <div className="manage-list">
            {summary?.posts.map((item) => (
              <div key={item.slug} className={editingSlug === item.slug ? "manage-item active" : "manage-item"}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{new Date(item.date).toLocaleDateString()} · {item.views} view{item.views === 1 ? "" : "s"} · {item.commentCount} comment{item.commentCount === 1 ? "" : "s"}</span>
                </div>
                <div className="manage-actions">
                  <button className="icon-action" type="button" title="Edit post" onClick={() => editPublishedPost(item)}>
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button className="icon-action" type="button" title="Manage comments" onClick={() => loadComments(item.slug)}>
                    <MessageCircle size={16} aria-hidden />
                  </button>
                  <button className="icon-action danger" type="button" title="Delete post" onClick={() => deletePost(item.slug, item.title)}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedCommentsSlug ? (
            <div className="comment-manager">
              <h3>
                <MessageCircle size={18} aria-hidden /> Comments
              </h3>
              {selectedComments.length ? (
                selectedComments.map((comment) => (
                  <article key={comment.id} className="managed-comment">
                    <div>
                      <strong>{comment.name}</strong>
                      <span>{comment.body}</span>
                    </div>
                    <button className="icon-action danger" type="button" title="Delete comment" onClick={() => deleteComment(comment.id)}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </article>
                ))
              ) : (
                <p className="empty-note">No comments on this post yet.</p>
              )}
              {commentStatus ? <p className="form-status">{commentStatus}</p> : null}
            </div>
          ) : null}
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

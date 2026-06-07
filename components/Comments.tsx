"use client";

import { FormEvent, useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/comments/${slug}`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
      .catch(() => setStatus("Comments are taking a moment to load."));
  }, [slug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const res = await fetch(`/api/comments/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, body })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.message || "Could not post that comment.");
      return;
    }
    setComments(data.comments || []);
    setBody("");
    setStatus("Comment posted.");
  }

  return (
    <div className="comment-box">
      <form className="comment-form" onSubmit={submit}>
        <label className="field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
        </label>
        <label className="field">
          Comment
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Leave a note of encouragement..." required />
        </label>
        <button className="button primary" disabled={busy} type="submit">
          <Send size={17} aria-hidden /> Post comment
        </button>
        {status ? <p className="form-status">{status}</p> : null}
      </form>
      <div className="comment-list">
        <h3>
          <MessageCircle size={20} aria-hidden /> {comments.length} comment{comments.length === 1 ? "" : "s"}
        </h3>
        {comments.map((comment) => (
          <article className="comment" key={comment.id}>
            <div className="meta">
              {comment.name} · {formatDate(comment.createdAt)}
            </div>
            <p>{comment.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

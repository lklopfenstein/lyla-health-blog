"use client";

import { FormEvent, useState } from "react";
import { MailPlus } from "lucide-react";

export function Subscribe({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const res = await fetch("/api/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.message || "Could not subscribe right now.");
      return;
    }
    setEmail("");
    setName("");
    setStatus("You are subscribed for new post emails.");
  }

  return (
    <form id="subscribe" className={compact ? "subscribe compact" : "subscribe"} onSubmit={submit}>
      <div>
        <p className="eyebrow">Email updates</p>
        <h2>Get new posts in your inbox</h2>
      </div>
      <div className="subscribe-fields">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" required />
        <button className="button primary" disabled={busy} type="submit">
          <MailPlus size={17} aria-hidden /> Subscribe
        </button>
      </div>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}

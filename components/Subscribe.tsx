"use client";

import { FormEvent, useState } from "react";
import { Bell, MailPlus, Rss } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

export function Subscribe({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [pushStatus, setPushStatus] = useState("");
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

  async function enableNotifications() {
    setPushStatus("");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("Browser notifications are not supported on this device.");
      return;
    }

    const config = await fetch("/api/push/subscribe", { cache: "no-store" }).then((res) => res.json());
    if (!config.publicKey) {
      setPushStatus("Browser notifications are not connected yet.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("Notifications were not turned on.");
      return;
    }

    setPushStatus("Turning on notifications...");
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription })
    });
    const data = await res.json();
    setPushStatus(res.ok ? "Browser notifications are on." : data.message || "Could not turn on notifications.");
  }

  return (
    <form id="subscribe" className={compact ? "subscribe compact" : "subscribe"} onSubmit={submit}>
      <div className="subscribe-intro">
        <p className="eyebrow">Follow updates</p>
        <h2>Get notified when there is a new post</h2>
        <p>Choose email, browser notifications, or a free update feed. Use whichever is easiest for you.</p>
      </div>
      <div className="notify-options">
        <div className="notify-card email-card">
          <div>
            <MailPlus size={20} aria-hidden />
            <strong>Email me new posts</strong>
            <span>The familiar option. Enter your name and email and new posts can arrive in your inbox.</span>
          </div>
          <div className="subscribe-fields">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" required />
            <button className="button primary" disabled={busy} type="submit">
              <MailPlus size={17} aria-hidden /> Sign up by email
            </button>
          </div>
        </div>

        <div className="notify-card">
          <div>
            <Bell size={20} aria-hidden />
            <strong>Turn on browser notifications</strong>
            <span>A free option that can notify you on this device when a new post is published.</span>
          </div>
          <button className="button" type="button" onClick={enableNotifications}>
            <Bell size={17} aria-hidden /> Turn on notifications
          </button>
        </div>

        <div className="notify-card">
          <div>
            <Rss size={20} aria-hidden />
            <strong>Follow the free update feed</strong>
            <span>Use the feed with a free reader like Feedly, Inoreader, NetNewsWire, or Feeder.</span>
          </div>
          <a className="button" href="/rss.xml">
            <Rss size={17} aria-hidden /> Open update feed
          </a>
        </div>
      </div>
      {status ? <p className="form-status">{status}</p> : null}
      {pushStatus ? <p className="form-status">{pushStatus}</p> : null}
    </form>
  );
}

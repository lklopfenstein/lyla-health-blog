"use client";

import { useEffect } from "react";

export function TrafficTracker() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const path = window.location.pathname;
    const key = `visit:${today}:${path}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    let visitorId = localStorage.getItem("visitor-id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("visitor-id", visitorId);
    }
    fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, visitorId })
    }).catch(() => {});
  }, []);

  return null;
}

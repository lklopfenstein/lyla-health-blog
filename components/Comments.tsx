"use client";

import { useEffect, useRef } from "react";

export function Comments({ slug }: { slug: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  useEffect(() => {
    if (!repo || !ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("repo", repo);
    script.setAttribute("issue-term", `post-${slug}`);
    script.setAttribute("label", "reader-comment");
    script.setAttribute("theme", "github-light");
    ref.current.appendChild(script);
  }, [repo, slug]);

  if (!repo) {
    return (
      <div className="notice">
        Comments are ready to turn on. Set <strong>NEXT_PUBLIC_GITHUB_REPO</strong> to
        <strong> owner/repo</strong> in Vercel, enable GitHub issues, and install the free Utterances app.
      </div>
    );
  }

  return <div ref={ref} />;
}

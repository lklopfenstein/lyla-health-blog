"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "@/lib/content";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export function PostArchive({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts;
    return posts.filter((post) => `${post.title} ${post.excerpt} ${post.date}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, posts]);
  const visiblePosts = filteredPosts.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(12);
  }, [normalizedQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= filteredPosts.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + 12, filteredPosts.length));
        }
      },
      { rootMargin: "420px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPosts.length, visibleCount]);

  return (
    <section id="updates" className="content-band">
      <div className="content-inner">
        <div className="toolbar">
          <div>
            <p className="eyebrow">All updates</p>
            <h2>Journal archive</h2>
          </div>
          <label className="search-wrap">
            <span className="sr-only">Search posts</span>
            <input
              className="search"
              type="search"
              placeholder="Search updates, dates, photos..."
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
        </div>
        <div className="post-grid">
          {visiblePosts.map((post) => {
            const commentCount = post.commentCount ?? post.legacyCommentCount ?? 0;
            return (
            <Link
              className="post-card"
              href={`/posts/${post.slug}`}
              key={post.slug}
            >
              <div className="post-card-media">
                {post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" /> : null}
              </div>
              <div className="post-card-body">
                <div className="meta">{formatDate(post.date)}</div>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="meta">
                  <MessageCircle size={14} aria-hidden />
                  {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : "Open comments"}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
        {visiblePosts.length === 0 ? (
          <div className="notice">
            {posts.length === 0
              ? "No posts have been added yet. Open the private admin area to publish the first update."
              : "No posts match that search yet."}
          </div>
        ) : null}
        <div ref={sentinelRef} className="archive-sentinel" aria-hidden />
        {visiblePosts.length < filteredPosts.length ? (
          <div className="archive-loading">Loading more updates...</div>
        ) : null}
      </div>
    </section>
  );
}

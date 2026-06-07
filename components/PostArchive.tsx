"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Post } from "@/lib/content";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function PostArchive({ posts }: { posts: Post[] }) {
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
              onInput={(event) => {
                const query = event.currentTarget.value.toLowerCase();
                document.querySelectorAll<HTMLElement>("[data-post-card]").forEach((card) => {
                  const haystack = card.dataset.search || "";
                  card.hidden = query.length > 0 && !haystack.includes(query);
                });
              }}
            />
          </label>
        </div>
        <div className="post-grid">
          {posts.map((post) => (
            <Link
              className="post-card"
              href={`/posts/${post.slug}`}
              key={post.slug}
              data-post-card
              data-search={`${post.title} ${post.excerpt} ${post.date}`.toLowerCase()}
            >
              <div className="post-card-media">
                {post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" /> : null}
              </div>
              <div className="post-card-body">
                <div className="meta">{formatDate(post.date)}</div>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="meta">
                  <MessageCircle size={14} aria-hidden /> {post.commentsImported || 0} CaringBridge comments imported as a count
                </div>
              </div>
            </Link>
          ))}
        </div>
        {posts.length === 0 ? (
          <div className="notice">
            No posts have been imported yet. Run <strong>npm run import:caringbridge</strong> to bring in the public CaringBridge history.
          </div>
        ) : null}
      </div>
    </section>
  );
}

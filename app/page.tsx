import Link from "next/link";
import { ArrowRight, Heart, MailPlus } from "lucide-react";
import { Nav } from "@/components/Nav";
import { PostArchive } from "@/components/PostArchive";
import { Subscribe } from "@/components/Subscribe";
import { getAllPosts, getSiteMeta } from "@/lib/content";

function formatNumber(value?: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDate(date?: string) {
  if (!date) return "Ready";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export default function Home() {
  const posts = getAllPosts();
  const site = getSiteMeta();
  const latest = posts[0];
  const cover = latest?.coverImage || "";

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div>
          <p className="eyebrow">A home for every update</p>
          <h1>{site.title}</h1>
          <p>
            A calmer, beautiful place for health updates, photos, songs, comments, and the whole historical archive in one easy home.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="#updates">
              Read updates <ArrowRight size={17} aria-hidden />
            </Link>
            <Link className="button" href="#subscribe">
              Get email updates <MailPlus size={17} aria-hidden />
            </Link>
          </div>
        </div>
        <Link className="portrait-frame" href={latest ? `/posts/${latest.slug}` : "#updates"}>
          {cover ? <img src={cover} alt="" /> : null}
          <div className="portrait-note">
            <div className="meta">Latest update</div>
            <strong>{latest?.title || "Ready for the first post"}</strong>
            <div className="meta">{formatDate(latest?.date)}</div>
          </div>
        </Link>
      </section>
      <section className="stats" aria-label="Site highlights">
        <div className="stat">
          <strong>{posts.length}</strong>
          <span>historical posts</span>
        </div>
        <div className="stat">
          <strong>{formatNumber(site.visitsImportedFromPreviousSite)}</strong>
          <span>visits carried forward from the original journal</span>
        </div>
        <div className="stat">
          <strong>Free</strong>
          <span>email updates, photos, songs, and open comments</span>
        </div>
      </section>
      <section className="content-inner subscribe-wrap">
        <Subscribe />
      </section>
      <PostArchive posts={posts} />
      <footer className="footer">
        <Heart size={16} aria-hidden /> Built to keep family close without donation popups.
      </footer>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, Heart, PenLine } from "lucide-react";
import { Nav } from "@/components/Nav";
import { PostArchive } from "@/components/PostArchive";
import { getAllPosts, getSiteMeta } from "@/lib/content";

function formatNumber(value?: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDate(date?: string) {
  if (!date) return "Ready";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
}

export default function Home() {
  const posts = getAllPosts();
  const site = getSiteMeta();
  const latest = posts[0];
  const cover = latest?.coverImage || "https://assets.caringbridge.org/image/upload/w_1200,h_630,c_pad,b_white,q_auto,f_auto,f_auto/q3vmgbjtf20kxuj6inbd";

  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div>
          <p className="eyebrow">A home for every update</p>
          <h1>{site.title}</h1>
          <p>
            A calmer, beautiful place for health updates, photos, comments, and the whole historical archive brought over from
            CaringBridge.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="#updates">
              Read updates <ArrowRight size={17} aria-hidden />
            </Link>
            <Link className="button" href="/studio">
              Write a post <PenLine size={17} aria-hidden />
            </Link>
          </div>
        </div>
        <Link className="portrait-frame" href={latest ? `/posts/${latest.slug}` : "#updates"}>
          <img src={cover} alt="" />
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
          <strong>{formatNumber(site.visitsImportedFromCaringBridge)}</strong>
          <span>CaringBridge visits preserved as context</span>
        </div>
        <div className="stat">
          <strong>Free</strong>
          <span>GitHub, Vercel, and GitHub issue comments</span>
        </div>
      </section>
      <PostArchive posts={posts} />
      <footer className="footer">
        <Heart size={16} aria-hidden /> Built to keep family close without donation popups.
      </footer>
    </main>
  );
}

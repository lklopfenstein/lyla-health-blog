import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MessageCircle, Share2 } from "lucide-react";
import { Comments } from "@/components/Comments";
import { Markdown } from "@/components/Markdown";
import { Nav } from "@/components/Nav";
import { Subscribe } from "@/components/Subscribe";
import { getAllPosts, getPost } from "@/lib/content";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Lyla Klopfenstein`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined
    }
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <main className="shell">
      <Nav />
      <article className="post-page">
        <Link className="button ghost" href="/#updates">
          <ArrowLeft size={17} aria-hidden />
          Back to updates
        </Link>
        <p className="eyebrow">{post.source || "Journal update"}</p>
        <h1>{post.title}</h1>
        <div className="meta">
          <CalendarDays size={15} aria-hidden /> {formatDate(post.date)} by {post.author}
        </div>
        {post.coverImage ? (
          <div className="post-cover">
            <img src={post.coverImage} alt="" />
          </div>
        ) : null}
        <Markdown body={post.body} />
        <div className="hero-actions">
          <a className="button" href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`/posts/${post.slug}`)}`}>
            <Share2 size={17} aria-hidden />
            Share by email
          </a>
        </div>
        <section id="comments" className="comments">
          <h2>
            <MessageCircle size={22} aria-hidden /> Comments
          </h2>
          <Comments slug={post.slug} />
        </section>
        <Subscribe compact />
      </article>
    </main>
  );
}

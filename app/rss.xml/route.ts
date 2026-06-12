import { getAllPosts, getSiteMeta } from "@/lib/content";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = process.env.SITE_URL || "https://lyla-health-blog.vercel.app";
  const [posts, site] = await Promise.all([getAllPosts(), getSiteMeta()]);
  const updated = posts[0]?.date || new Date().toISOString();

  const items = posts
    .slice(0, 40)
    .map((post) => {
      const url = `${siteUrl}/posts/${post.slug}`;
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(url)}</link>
  <guid>${escapeXml(url)}</guid>
  <pubDate>${new Date(post.date).toUTCString()}</pubDate>
  <description>${escapeXml(post.excerpt)}</description>
</item>`;
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${escapeXml(site.title)}</title>
  <link>${escapeXml(siteUrl)}</link>
  <description>Updates from ${escapeXml(site.title)}</description>
  <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

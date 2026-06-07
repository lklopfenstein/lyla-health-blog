import fs from "node:fs/promises";
import path from "node:path";

const SITE_ID = "ef38d8d4-9caa-39c3-9cb2-5bab89e5de12";
const ENDPOINT = "https://hgsvhqovbrbt3ivcfobjm5ip6y.appsync-api.us-east-2.amazonaws.com/graphql";
const OUTPUT_DIR = path.join(process.cwd(), "content", "posts");
const COMMENTS_DIR = path.join(process.cwd(), "content", "comments");

const query = `query GET_FEED($siteId: String!, $limit: Int, $sortDirection: SortDirection, $nextToken: String) {
  getSite(query: { id: $siteId }) {
    id
    firstName
    lastName
    title
    numVisits
    mainSitePhoto { publicId legacyPath width height }
    feedConnection(query: { paginationInput: { limit: $limit sortDirection: $sortDirection nextToken: $nextToken } }) {
      nextToken
      feeds {
        id
        type
        isPinned
        item {
          ... on Post {
            id
            siteId
            title
            createdAt
            body
            photos { publicId legacyPath width height }
            author { firstName lastName }
            commentCount { totalDescendentCount }
            reactionGroupSummary { totalCount type }
          }
        }
      }
    }
  }
}`;

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "update";
}

function escapeYaml(value = "") {
  return JSON.stringify(String(value));
}

function cloudinaryUrl(photo) {
  if (!photo?.publicId && !photo?.legacyPath) return "";
  if (photo.legacyPath?.startsWith("http")) return photo.legacyPath;
  if (photo.publicId) {
    return `https://assets.caringbridge.org/image/upload/f_auto,q_auto/${photo.publicId}`;
  }
  return `https://assets.caringbridge.org${photo.legacyPath}`;
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#61;/g, "=")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-");
}

function normalizeBody(body = "") {
  return decodeEntities(String(body))
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\uFFFD/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_")
    .replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, "$1")
    .replace(/<span\b[^>]*>([\s\S]*?)<\/span>/gi, "$1")
    .replace(/<li\b[^>]*>\s*([\s\S]*?)\s*<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<\/p>\s*<p\b[^>]*>/gi, "\n\n")
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<div\b[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\bCaringBridge\b/g, "the previous journal")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupePhotos(photos = []) {
  const seen = new Set();
  return photos.filter((photo) => {
    const url = cloudinaryUrl(photo);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

async function fetchPage(nextToken) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "anonymousaccess"
    },
    body: JSON.stringify({
      query,
      variables: {
        siteId: SITE_ID,
        limit: 25,
        sortDirection: "DESCENDING",
        nextToken
      }
    })
  });

  if (!res.ok) {
    throw new Error(`CaringBridge request failed: ${res.status} ${res.statusText}`);
  }

  const payload = await res.json();
  if (payload.errors?.length) {
    throw new Error(JSON.stringify(payload.errors, null, 2));
  }
  return payload.data.getSite;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.rm(COMMENTS_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(COMMENTS_DIR, { recursive: true });

  let nextToken;
  const rawPosts = [];
  let site;

  do {
    site = await fetchPage(nextToken);
    const connection = site.feedConnection;
    for (const feed of connection.feeds) {
      if (feed.type === "POST" && feed.item?.id) rawPosts.push({ ...feed.item, isPinned: feed.isPinned });
    }
    nextToken = connection.nextToken;
    console.log(`Fetched ${rawPosts.length} entries so far...`);
  } while (nextToken);

  const posts = rawPosts
    .map((post) => ({
      ...post,
      normalizedBody: normalizeBody(post.body),
      photos: post.photos || []
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const journalPosts = posts.filter((post) => post.normalizedBody.length > 0);
  const photoOnlyPosts = posts.filter((post) => post.normalizedBody.length === 0 && post.photos.length > 0);

  for (const photoPost of photoOnlyPosts) {
    const photoTime = new Date(photoPost.createdAt).getTime();
    const target = journalPosts
      .filter((post) => post.title === photoPost.title || post.createdAt.slice(0, 10) === photoPost.createdAt.slice(0, 10))
      .map((post) => ({ post, distance: Math.abs(new Date(post.createdAt).getTime() - photoTime) }))
      .filter(({ distance }) => distance <= 1000 * 60 * 90)
      .sort((a, b) => a.distance - b.distance)[0]?.post;

    if (target) {
      target.photos = dedupePhotos([...(target.photos || []), ...photoPost.photos]);
    } else {
      photoPost.photos = dedupePhotos(photoPost.photos);
      journalPosts.push(photoPost);
    }
  }

  const seen = new Set();
  for (const post of journalPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
    const date = new Date(post.createdAt);
    const datePrefix = date.toISOString().slice(0, 10);
    const base = slugify(post.title || normalizeBody(post.body).slice(0, 48) || post.id);
    let slug = `${datePrefix}-${base}`;
    let n = 2;
    while (seen.has(slug)) slug = `${datePrefix}-${base}-${n++}`;
    seen.add(slug);

    const photos = dedupePhotos(post.photos || []).map(cloudinaryUrl).filter(Boolean);
    const markdownPhotos = photos.map((url, index) => `![Photo ${index + 1}](${url})`).join("\n\n");
    const body = [post.normalizedBody, markdownPhotos].filter(Boolean).join("\n\n");
    const author = [post.author?.firstName, post.author?.lastName].filter(Boolean).join(" ") || "Lyla Klopfenstein";

    const frontmatter = [
      "---",
      `title: ${escapeYaml(post.title || "Update")}`,
      `date: ${escapeYaml(date.toISOString())}`,
      `author: ${escapeYaml(author)}`,
      `source: ${escapeYaml("Imported archive")}`,
      `sourceId: ${escapeYaml(post.id)}`,
      `legacyCommentCount: ${post.commentCount?.totalDescendentCount ?? 0}`,
      `pinned: ${post.isPinned ? "true" : "false"}`,
      `coverImage: ${escapeYaml(photos[0] || "")}`,
      "---",
      ""
    ].join("\n");

    await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.md`), `${frontmatter}${body}\n`);
    await fs.writeFile(path.join(COMMENTS_DIR, `${slug}.json`), "[]\n");
  }

  await fs.writeFile(
    path.join(process.cwd(), "content", "site.json"),
    JSON.stringify(
      {
        title: site.title || "Lyla Klopfenstein",
        firstName: site.firstName,
        lastName: site.lastName,
        visitsImportedFromPreviousSite: site.numVisits,
        importedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log(`Imported ${journalPosts.length} journal posts into ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

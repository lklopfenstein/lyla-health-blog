import fs from "node:fs/promises";
import path from "node:path";

const SITE_ID = "ef38d8d4-9caa-39c3-9cb2-5bab89e5de12";
const ENDPOINT = "https://hgsvhqovbrbt3ivcfobjm5ip6y.appsync-api.us-east-2.amazonaws.com/graphql";
const OUTPUT_DIR = path.join(process.cwd(), "content", "posts");

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

function normalizeBody(body = "") {
  return String(body)
    .replace(/\r\n/g, "\n")
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
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#61;/g, "=")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let nextToken;
  const posts = [];
  let site;

  do {
    site = await fetchPage(nextToken);
    const connection = site.feedConnection;
    for (const feed of connection.feeds) {
      if (feed.type === "POST" && feed.item?.id) posts.push({ ...feed.item, isPinned: feed.isPinned });
    }
    nextToken = connection.nextToken;
    console.log(`Fetched ${posts.length} posts so far...`);
  } while (nextToken);

  const seen = new Set();
  for (const post of posts) {
    const date = new Date(post.createdAt);
    const datePrefix = date.toISOString().slice(0, 10);
    const base = slugify(post.title || normalizeBody(post.body).slice(0, 48) || post.id);
    let slug = `${datePrefix}-${base}`;
    let n = 2;
    while (seen.has(slug)) slug = `${datePrefix}-${base}-${n++}`;
    seen.add(slug);

    const photos = (post.photos || []).map(cloudinaryUrl).filter(Boolean);
    const markdownPhotos = photos.map((url, index) => `![Photo ${index + 1}](${url})`).join("\n\n");
    const body = [normalizeBody(post.body), markdownPhotos].filter(Boolean).join("\n\n");
    const author = [post.author?.firstName, post.author?.lastName].filter(Boolean).join(" ") || "Lyla Klopfenstein";

    const frontmatter = [
      "---",
      `title: ${escapeYaml(post.title || "Update")}`,
      `date: ${escapeYaml(date.toISOString())}`,
      `author: ${escapeYaml(author)}`,
      `source: ${escapeYaml("CaringBridge")}`,
      `sourceId: ${escapeYaml(post.id)}`,
      `commentsImported: ${post.commentCount?.totalDescendentCount ?? 0}`,
      `pinned: ${post.isPinned ? "true" : "false"}`,
      `coverImage: ${escapeYaml(photos[0] || "")}`,
      "---",
      ""
    ].join("\n");

    await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.md`), `${frontmatter}${body}\n`);
  }

  await fs.writeFile(
    path.join(process.cwd(), "content", "site.json"),
    JSON.stringify(
      {
        title: site.title || "Lyla Klopfenstein",
        firstName: site.firstName,
        lastName: site.lastName,
        visitsImportedFromCaringBridge: site.numVisits,
        importedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log(`Imported ${posts.length} posts into ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

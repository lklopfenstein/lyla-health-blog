# Lyla Klopfenstein Health Blog

A free, GitHub-backed, Vercel-hosted replacement for the CaringBridge site.

## What Is Included

- 74 historical CaringBridge posts imported into `content/posts`.
- Static Next.js pages for fast, free Vercel hosting.
- Searchable archive and individual shareable post links.
- Photo support through Markdown image syntax.
- Free reader comments through GitHub Issues and Utterances.
- Browser-based author studio at `/studio` for saving drafts, publishing posts, and uploading images through GitHub.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Import CaringBridge Again

```bash
npm run import:caringbridge
```

The importer reads the public CaringBridge feed and rewrites Markdown files in `content/posts`.

## Author Studio

Set `NEXT_PUBLIC_GITHUB_REPO` to the final `owner/repo` value in Vercel and locally if needed. Then open `/studio`, paste a fine-grained GitHub token with **Contents: Read and write**, and use:

- `Save draft` to commit Markdown into `content/drafts`.
- `Publish` to commit Markdown into `content/posts`.
- `Add image` to commit files into `public/uploads` and insert Markdown.

The token is stored only in the browser's local storage.

## Comments

Comments use the free [Utterances](https://utteranc.es/) GitHub app.

1. Enable GitHub Issues for the repo.
2. Install Utterances for the repo.
3. Set `NEXT_PUBLIC_GITHUB_REPO` in Vercel to `owner/repo`.

Each post gets its own GitHub issue thread.

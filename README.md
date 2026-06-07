# Lyla Klopfenstein Health Blog

A free family journal with a searchable archive, photo-rich posts, open comments, email subscriptions, private drafting, and a small admin dashboard.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Content

- Published updates live in `content/posts`.
- Drafts live in `content/drafts`.
- Reader comments live in `content/comments`.
- Subscribers live in `content/subscribers.json`.
- Basic traffic totals live in `content/traffic.json`.
- Uploaded images live in `public/uploads`.

## Private Admin

Open `/admin` and sign in with the configured admin password. The dashboard can publish posts, save drafts, upload images, view subscribers, and see basic traffic totals.

Required environment values:

```bash
ADMIN_PASSWORD=
ADMIN_SECRET=
CONTENT_REPO=
CONTENT_BRANCH=main
CONTENT_TOKEN=
SITE_URL=
```

Optional email notifications:

```bash
RESEND_API_KEY=
EMAIL_FROM=
```

When email is connected, publishing a post can notify subscribers automatically.

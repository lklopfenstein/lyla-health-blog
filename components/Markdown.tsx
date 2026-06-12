function spotifyEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "open.spotify.com") return null;
    const [kind, id] = parsed.pathname.split("/").filter(Boolean);
    if (!kind || !id || !["album", "episode", "playlist", "show", "track"].includes(kind)) return null;
    return `https://open.spotify.com/embed/${kind}/${id}`;
  } catch {
    return null;
  }
}

function SpotifyEmbed({ url }: { url: string }) {
  const embedUrl = spotifyEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="spotify-embed">
      <iframe
        title="Spotify player"
        src={embedUrl}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url);
}

function VideoEmbed({ url }: { url: string }) {
  return (
    <video className="post-video" src={url} controls playsInline preload="metadata" />
  );
}

function inline(text: string) {
  const parts = text.split(/(!?\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|_[^_]+_|(?:https?:\/\/|www\.)[^\s]+)/g);
  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) return <img key={index} src={image[2]} alt={image[1]} loading="lazy" />;

    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;

    const italic = part.match(/^_([^_]+)_$/);
    if (italic) return <em key={index}>{italic[1]}</em>;

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      if (spotifyEmbedUrl(link[2])) return <SpotifyEmbed key={index} url={link[2]} />;
      if (isVideoUrl(link[2])) return <VideoEmbed key={index} url={link[2]} />;
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }

    if (/^(https?:\/\/|www\.)/.test(part)) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      if (spotifyEmbedUrl(href)) return <SpotifyEmbed key={index} url={href} />;
      if (isVideoUrl(href)) return <VideoEmbed key={index} url={href} />;
      return (
        <a key={index} href={href} target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    }

    return part;
  });
}

export function Markdown({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <div className="prose">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (spotifyEmbedUrl(trimmed)) return <SpotifyEmbed key={index} url={trimmed} />;
        if (isVideoUrl(trimmed)) return <VideoEmbed key={index} url={trimmed} />;
        const videoLink = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (videoLink && isVideoUrl(videoLink[2])) return <VideoEmbed key={index} url={videoLink[2]} />;
        if (trimmed.startsWith("### ")) return <h3 key={index}>{inline(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith("## ")) return <h2 key={index}>{inline(trimmed.slice(3))}</h2>;
        if (trimmed.startsWith("# ")) return <h2 key={index}>{inline(trimmed.slice(2))}</h2>;
        if (trimmed.startsWith("![")) return <div key={index}>{inline(trimmed)}</div>;
        if (trimmed.split("\n").every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={index}>
              {trimmed.split("\n").map((line, itemIndex) => (
                <li key={itemIndex}>{inline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{inline(trimmed.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}

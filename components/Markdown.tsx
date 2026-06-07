function inline(text: string) {
  const parts = text.split(/(!?\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) return <img key={index} src={image[2]} alt={image[1]} loading="lazy" />;

    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;

    const italic = part.match(/^_([^_]+)_$/);
    if (italic) return <em key={index}>{italic[1]}</em>;

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }

    if (/^https?:\/\//.test(part)) {
      return (
        <a key={index} href={part} target="_blank" rel="noreferrer">
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

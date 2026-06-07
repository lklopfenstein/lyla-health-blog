import Link from "next/link";
import { Home, MessageCircle, PenLine, Search } from "lucide-react";

export function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Lyla Klopfenstein home">
          <span className="brand-mark">L</span>
          <span>Lyla Klopfenstein</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/">
            <Home size={16} aria-hidden />
            Home
          </Link>
          <Link href="/#updates">
            <Search size={16} aria-hidden />
            Updates
          </Link>
          <Link href="/studio">
            <PenLine size={16} aria-hidden />
            Write
          </Link>
          <a href="#comments">
            <MessageCircle size={16} aria-hidden />
            Comments
          </a>
        </nav>
      </div>
    </header>
  );
}

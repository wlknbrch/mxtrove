import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { env } from "@/lib/env";

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-col gap-3 border-t border-white/[0.06] pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p>
        MxTrove is developed by{" "}
        <a
          href="https://wlknbrch.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground transition-colors hover:text-accent-secondary"
        >
          WLKNBRCH
        </a>
        .
        {!env.isOfficialInstance ? <span className="mt-1 block">Independent instance operated by {env.operatorName}. Not affiliated with the MxTrove project.</span> : null}
      </p>
      <nav aria-label="About and legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <a href={env.sourceUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">Source (AGPL-3.0)</a>
        <Link to="/about" className="transition-colors hover:text-foreground">About</Link>
        <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
        <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        <a
          href="https://paypal.me/WLKNBRCH"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-accent-secondary transition-colors hover:text-foreground"
        >
          Donate
        </a>
      </nav>
    </footer>
  );
}

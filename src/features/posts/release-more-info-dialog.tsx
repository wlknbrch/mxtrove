import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Code2, Copy, ExternalLink, Info, Link2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReleaseQrCode } from "@/features/posts/release-qr-code";
import type { ResolvedPostCard } from "@/features/posts/types";
import type { ShareLink } from "@/types/domain";

export function ReleaseMoreInfoDialog({
  item,
  open,
  shareUrl,
  releaseAccess,
  onOpenChange,
}: {
  item: ResolvedPostCard;
  open: boolean;
  shareUrl: string;
  releaseAccess?: {
    freshUrl: string | null;
    links: ShareLink[];
    isCreating: boolean;
    revokingId: string | null;
    onCreate: () => void;
    onRevoke: (linkId: string) => void;
  };
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(3,2,10,0.9)] backdrop-blur-xl"
        aria-label="Close release information"
        onClick={() => onOpenChange(false)}
      />
      <section className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-accent/22 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.2),transparent_34%),linear-gradient(180deg,rgba(20,15,38,0.99),rgba(8,7,20,0.99))] shadow-[0_36px_120px_rgba(0,0,0,0.76)] sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/12 text-accent-secondary">
              <Info className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-accent-secondary/82">Release archive</p>
              <h2 id={titleId} className="mt-2 break-words font-display text-2xl leading-tight tracking-[-0.04em] sm:text-4xl">
                More about {item.post.title}
              </h2>
            </div>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="sm"
            className="size-11 shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-0"
            aria-label="Close release information"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Release notes</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {item.post.release_notes || "No additional release notes were provided."}
              </p>
            </article>

            <article className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Credits</p>
              {item.credits.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {item.credits.map((credit) => (
                    <div key={credit.id} className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                      <span className="min-w-0 truncate text-sm">{credit.display_name}</span>
                      <Badge variant="neutral">{credit.role.replaceAll("_", " ")}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No credits have been added.</p>
              )}
            </article>

            <article className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6 lg:col-span-2">
              <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Scan, share, or embed</p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    Copy the canonical release URL, download its QR code, or place the release player on another site.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success("Release link copied.");
                      }}
                    >
                      <Copy className="size-4" />
                      Copy release link
                    </Button>
                    {item.post.allow_embed ? (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const code = `<iframe src="${window.location.origin}/embed/post/${item.post.id}" loading="lazy" allow="autoplay"></iframe>`;
                          await navigator.clipboard.writeText(code);
                          toast.success("Embed code copied.");
                        }}
                      >
                        <Code2 className="size-4" />
                        Copy embed
                      </Button>
                    ) : null}
                  </div>
                  {item.externalLinks.length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.externalLinks.map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost">
                            {link.label}
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
                <ReleaseQrCode url={shareUrl} title={item.post.title} />
              </div>
            </article>

            {releaseAccess ? (
              <article className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Release access</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Create private release links and revoke access when a link should no longer work. New tokens are only shown once.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={releaseAccess.onCreate}
                    disabled={releaseAccess.isCreating}
                  >
                    <Link2 className="size-4" />
                    New private link
                  </Button>
                </div>

                {releaseAccess.freshUrl ? (
                  <div className="mt-5 flex min-w-0 items-center gap-3 rounded-[18px] border border-success/20 bg-success/5 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{releaseAccess.freshUrl}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Copy new private release link"
                      onClick={async () => {
                        await navigator.clipboard.writeText(releaseAccess.freshUrl!);
                        toast.success("Private release link copied.");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                ) : null}

                {releaseAccess.links.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    {releaseAccess.links.map((link) => (
                      <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-white/[0.08] px-4 py-3">
                        <Badge variant={link.is_active ? "success" : "neutral"}>
                          {link.is_active ? "active" : "revoked"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{link.use_count} opens</span>
                        <span className="text-sm text-muted-foreground">
                          {link.expires_at ? `expires ${new Date(link.expires_at).toLocaleDateString()}` : "no expiry"}
                        </span>
                        {link.is_active ? (
                          <Button
                            className="ml-auto"
                            size="sm"
                            variant="ghost"
                            onClick={() => releaseAccess.onRevoke(link.id)}
                            disabled={releaseAccess.revokingId === link.id}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">No private release links have been created yet.</p>
                )}
              </article>
            ) : null}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

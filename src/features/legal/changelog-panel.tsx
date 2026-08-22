import { ChevronDown, Clock3, PackageCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getArchivedAppReleases, getCurrentAppRelease } from "@/features/legal/changelog";
import { env } from "@/lib/env";

function ReleaseChanges({ changes }: { changes: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
      {changes.map((change) => (
        <li key={change} className="flex gap-3">
          <span className="mt-[0.72rem] size-1.5 shrink-0 rounded-full bg-accent-secondary" />
          <span>{change}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChangelogPanel() {
  const currentRelease = getCurrentAppRelease(env.appVersion);
  const archivedReleases = getArchivedAppReleases(env.appVersion);

  return (
    <section className="space-y-5" aria-labelledby="changelog-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">What&apos;s new</Badge>
          <h2 id="changelog-title" className="mt-4 font-display text-3xl font-semibold tracking-[-0.035em] md:text-4xl">
            Changelog
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            The newest deployed version stays in focus. Earlier release notes remain available in the archive.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-accent/22 bg-accent/10 px-4 py-2 text-sm text-accent-secondary">
          <PackageCheck className="size-4" />
          <span className="font-medium">MxTrove v{env.appVersion}</span>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[30px] border-accent/22 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] md:px-8 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary">Latest release</p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em]">
              v{currentRelease.version} · {currentRelease.title}
            </h3>
          </div>
          <span className="text-sm text-muted-foreground">{currentRelease.date}</span>
        </div>
        <div className="mt-6 max-w-4xl">
          <ReleaseChanges changes={currentRelease.changes} />
        </div>
      </Card>

      {archivedReleases.length > 0 ? (
        <details className="group rounded-[30px] border border-border bg-white/[0.018] p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[24px] px-4 py-4 transition-colors hover:bg-white/[0.035] marker:hidden sm:px-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent-secondary">
                <Clock3 className="size-5" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold">Browse older versions</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {archivedReleases.length} archived release{archivedReleases.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 px-1 pb-1 pt-3 md:grid-cols-2">
            {archivedReleases.map((release) => (
              <article key={release.version} className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant="neutral">v{release.version}</Badge>
                    <h3 className="mt-3 font-display text-xl font-semibold">{release.title}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>
                <div className="mt-4">
                  <ReleaseChanges changes={release.changes} />
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

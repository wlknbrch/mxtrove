import { useQuery } from "@tanstack/react-query";
import { MessageCircleMore, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppViewer } from "@/hooks/use-app-viewer";

import { listConversations } from "@/features/messages/api";
import { ConversationRail } from "@/features/messages/messages-shell";

export function MessagesPage() {
  const viewer = useAppViewer();
  const [search, setSearch] = useState("");
  const conversationsQuery = useQuery({
    queryKey: ["conversations", viewer.userId],
    queryFn: () => listConversations(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const unreadThreads = (conversationsQuery.data ?? []).filter((item) => item.unreadCount > 0).length;
  const unreadMessages = (conversationsQuery.data ?? []).reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Direct messages"
        title="Inbox"
        description="Keep release feedback, collaborator notes, and artist follow-ups in a focused inbox with visible unread state."
        actions={
          <Link to="/explore">
            <Button variant="secondary">Browse artists</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ConversationRail
          items={conversationsQuery.data ?? []}
          search={search}
          onSearchChange={setSearch}
          title="Inbox"
          description="Search by artist name, handle, or the last thing someone sent you."
        />

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="rounded-[28px] border border-accent/18 bg-[radial-gradient(circle_at_top_right,rgba(157,92,255,0.24),rgba(255,255,255,0.02)_60%,rgba(255,255,255,0.01))] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent">Message flow</Badge>
                <Badge variant="neutral">{conversationsQuery.data?.length ?? 0} active threads</Badge>
                <Badge variant="neutral">{unreadMessages} unread messages</Badge>
              </div>
              <p className="mt-5 max-w-3xl font-display text-4xl leading-[1.02] tracking-[-0.04em] md:text-[3.4rem]">
                Keep fan, collaborator, and artist feedback close to the music.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Start from a public profile, jump into an existing thread, or keep the inbox ready for the moment
                someone reacts to a release.
              </p>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Inbox status</CardTitle>
                  <CardDescription className="mt-2">
                    Core conversation now includes visible unread thread state.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-3">
                {[
                  `${unreadThreads} thread${unreadThreads === 1 ? "" : "s"} currently need attention.`,
                  `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"} are waiting in the inbox.`,
                  "Open threads from public profiles and keep release feedback in one place.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recommended next step</CardTitle>
                  <CardDescription className="mt-2">
                    If this inbox is still empty, the fastest way to test it is from a public profile.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                  <Sparkles className="mt-0.5 size-4 text-accent-secondary" />
                  <p className="text-sm leading-7 text-muted-foreground">
                    Open an artist profile, hit <span className="text-foreground">Message artist</span>, and you land
                    directly in the thread view.
                  </p>
                </div>
                <Link to="/explore">
                  <Button fullWidth>
                    <MessageCircleMore className="size-4" />
                    Open explore
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

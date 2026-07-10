import { useDeferredValue, useMemo } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatRelativeTime } from "@/lib/utils";

import type { ConversationPreview } from "@/features/messages/api";

export function ConversationRail({
  items,
  search,
  onSearchChange,
  selectedConversationId,
  title = "Conversations",
  description = "Pick a thread or start one from a public profile.",
}: {
  items: ConversationPreview[];
  search: string;
  onSearchChange: (nextValue: string) => void;
  selectedConversationId?: string;
  title?: string;
  description?: string;
}) {
  const deferredSearch = useDeferredValue(search);
  const filteredItems = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (!normalized) {
        return true;
      }

      const counterpartName = item.counterpart?.display_name.toLowerCase() ?? "";
      const counterpartHandle = item.counterpart?.username.toLowerCase() ?? "";
      const lastMessage = item.lastMessage?.body.toLowerCase() ?? "";
      return (
        counterpartName.includes(normalized) ||
        counterpartHandle.includes(normalized) ||
        lastMessage.includes(normalized)
      );
    });
  }, [deferredSearch, items]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/[0.06] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Messages</p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <Badge variant="accent">{items.length}</Badge>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder="Search conversations"
            className="pl-11"
          />
        </div>
      </div>

      <div className="max-h-[68vh] overflow-y-auto px-3 py-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-6 text-sm leading-7 text-muted-foreground">
            No conversations match this search yet.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const selected = item.conversation.id === selectedConversationId;
              return (
                <Link
                  key={item.conversation.id}
                  to={`/messages/${item.conversation.id}`}
                  className={cn(
                    "flex items-start gap-3 rounded-[24px] border px-3 py-3 transition-[background-color,border-color,transform]",
                    selected
                      ? "border-accent/28 bg-[linear-gradient(90deg,rgba(157,92,255,0.18),rgba(157,92,255,0.05))]"
                      : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]",
                  )}
                >
                  <Avatar
                    alt={item.counterpart?.display_name ?? "Conversation"}
                    initials={item.counterpart?.display_name?.slice(0, 2).toUpperCase()}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {item.counterpart?.display_name ?? "Conversation"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.counterpart?.username ? `@${item.counterpart.username}` : "Direct thread"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.lastMessage ? formatRelativeTime(item.lastMessage.created_at) : "New"}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-muted-foreground">
                      {item.lastMessage?.body ?? "Start the conversation"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

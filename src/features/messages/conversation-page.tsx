import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { MessageCircleMore, SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

import { getConversation, listConversations, markConversationRead, sendMessage } from "@/features/messages/api";
import { ConversationRail } from "@/features/messages/messages-shell";
import { getMessageErrorMessage } from "@/features/messages/ui";

export function ConversationPage() {
  const { conversationId = "" } = useParams();
  const viewer = useAppViewer();
  const form = useForm<{ body: string }>({ defaultValues: { body: "" } });
  const [search, setSearch] = useState("");

  const conversationsQuery = useQuery({
    queryKey: ["conversations", viewer.userId],
    queryFn: () => listConversations(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
    enabled: Boolean(conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const trimmedBody = body.trim();
      if (!trimmedBody) {
        throw new Error("Write a message first.");
      }

      return sendMessage({
        conversationId,
        senderId: viewer.userId,
        values: { body: trimmedBody },
      });
    },
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations", viewer.userId] });
      await queryClient.invalidateQueries({ queryKey: ["messages-unread", viewer.userId] });
      toast.success("Message sent.");
    },
    onError: (error) => {
      toast.error(getMessageErrorMessage(error));
    },
  });
  const markReadMutation = useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations", viewer.userId] });
      await queryClient.invalidateQueries({ queryKey: ["messages-unread", viewer.userId] });
    },
  });

  const data = conversationQuery.data;
  const counterpart = data?.members.find((member) => member.id !== viewer.userId) ?? null;
  const lastMessageId = data?.messages.at(-1)?.id ?? null;
  const lastMarkedMessageIdRef = useRef<string | null>(null);
  const draft = form.watch("body");
  const queryErrorMessage = conversationQuery.error
    ? getMessageErrorMessage(conversationQuery.error)
    : null;
  const messageCount = data?.messages.length ?? 0;
  const publicProfilePath = counterpart?.username ? `/@${counterpart.username}` : null;
  const canSend =
    draft.trim().length > 0 &&
    !sendMutation.isPending &&
    !conversationQuery.isPending &&
    !conversationQuery.isError;
  const description = queryErrorMessage
    ? "The conversation could not be loaded correctly. The technical cause is shown below."
    : counterpart
      ? `Direct conversation with @${counterpart.username}. Read state stays in sync so the inbox can tell you what still needs attention.`
      : "Realtime is additive here. The conversation still works correctly without an active subscription.";

  useEffect(() => {
    if (!viewer.userId || !conversationId || !lastMessageId || conversationQuery.isError) {
      return;
    }

    if (lastMarkedMessageIdRef.current === lastMessageId) {
      return;
    }

    lastMarkedMessageIdRef.current = lastMessageId;
    void markReadMutation.mutateAsync();
  }, [conversationId, conversationQuery.isError, lastMessageId, markReadMutation, viewer.userId]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Conversation"
        title={counterpart?.display_name ?? "Direct message"}
        description={description}
      />

      <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <ConversationRail
          items={conversationsQuery.data ?? []}
          search={search}
          onSearchChange={setSearch}
          selectedConversationId={conversationId}
          title="Messages"
          description="Search the inbox, jump between threads, and keep feedback close to the release context."
        />

        <Card className="flex min-h-[68vh] flex-col overflow-hidden p-0">
          <div className="border-b border-white/[0.06] px-6 py-5">
            {counterpart ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    alt={counterpart.display_name}
                    initials={counterpart.display_name.slice(0, 2).toUpperCase()}
                    className="size-14"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="truncate font-display text-3xl tracking-[-0.03em]">{counterpart.display_name}</p>
                      <Badge variant="accent">Direct thread</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">@{counterpart.username}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {messageCount > 0 ? `${messageCount} message${messageCount === 1 ? "" : "s"}` : "No messages yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-display text-3xl tracking-[-0.03em]">Conversation</p>
                <p className="text-sm text-muted-foreground">Open a thread to read and reply.</p>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {conversationQuery.isPending ? (
              <div className="rounded-[20px] border border-border bg-white/3 px-4 py-4 text-sm text-muted-foreground">
                Loading conversation…
              </div>
            ) : null}

            {queryErrorMessage ? (
              <EmptyState
                icon={MessageCircleMore}
                title="Conversation unavailable"
                description={queryErrorMessage}
              />
            ) : null}

            {!conversationQuery.isPending && !queryErrorMessage && messageCount === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.02] px-5 py-8 text-sm leading-7 text-muted-foreground">
                {counterpart
                  ? `No messages yet. Start the conversation with ${counterpart.display_name}.`
                  : "No messages yet. Send the first message to start the conversation."}
              </div>
            ) : null}

            {data?.messages.map((message) => {
              const isOwn = message.sender_id === viewer.userId;
              return (
                <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[78%] items-end gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                    {!isOwn && counterpart ? (
                      <Avatar
                        alt={counterpart.display_name}
                        initials={counterpart.display_name.slice(0, 2).toUpperCase()}
                        className="size-10"
                      />
                    ) : null}
                    <div
                      className={isOwn
                        ? "rounded-[26px] rounded-br-[10px] bg-[linear-gradient(135deg,rgba(157,92,255,0.98),rgba(196,129,255,0.9))] px-4 py-3 text-white shadow-[0_20px_42px_rgba(99,45,205,0.28)]"
                        : "rounded-[26px] rounded-bl-[10px] border border-white/[0.08] bg-white/[0.04] px-4 py-3"}
                    >
                      {!isOwn && counterpart ? (
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-accent-secondary/80">
                          {counterpart.display_name}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-[15px] leading-7">{message.body}</p>
                      <p className={`mt-3 text-xs ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                        {formatRelativeTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="border-t border-white/[0.06] px-5 py-4"
            onSubmit={form.handleSubmit(async (values) => {
              await sendMutation.mutateAsync(values.body);
            })}
          >
            <div className="flex gap-3">
              <Input placeholder="Write a message" {...form.register("body")} />
              <Button type="submit" disabled={!canSend} className="min-w-28">
                <SendHorizonal className="size-4" />
                Send
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="rounded-[28px] border border-accent/16 bg-[radial-gradient(circle_at_top,rgba(157,92,255,0.22),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-5">
              <div className="flex items-center gap-4">
                <Avatar
                  alt={counterpart?.display_name ?? "Conversation"}
                  initials={(counterpart?.display_name ?? "DM").slice(0, 2).toUpperCase()}
                  className="size-16 text-base"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-3xl tracking-[-0.03em]">
                    {counterpart?.display_name ?? "Direct thread"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {counterpart?.username ? `@${counterpart.username}` : "Waiting for participant details"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-accent-secondary" />
                  <p className="font-medium">Conversation context</p>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  {counterpart?.bio?.trim() ||
                    "This side panel becomes more useful once the artist profile has a bio and links filled in."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-secondary/75">Thread health</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>{messageCount > 0 ? `${messageCount} messages in this thread.` : "No messages sent yet."}</p>
                  <p>{queryErrorMessage ? "Conversation currently has a loading issue." : "Thread loaded correctly."}</p>
                  <p>{counterpart?.location ? `Artist location: ${counterpart.location}` : "No public location shared."}</p>
                </div>
              </div>

              {publicProfilePath ? (
                <Link to={publicProfilePath}>
                  <Button fullWidth variant="secondary">View public profile</Button>
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileAudio,
  FolderKanban,
  Image,
  Link2,
  MessageCircleMore,
  Paperclip,
  SendHorizonal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createMessageReferenceAttachment,
  deleteMessageAttachment,
  getUploadableAttachmentKind,
  type MessageReferenceAttachmentType,
  uploadMessageAttachment,
} from "@/features/attachments/api";
import { MessageAttachmentCard } from "@/features/attachments/message-attachment-card";
import { getLibraryDashboard } from "@/features/library/api";
import { listResolvedPosts } from "@/features/posts/api";
import { listProjects } from "@/features/projects/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

import {
  deleteOwnMessage,
  getConversation,
  listConversations,
  markConversationRead,
  sendMessage,
} from "@/features/messages/api";
import { ConversationRail } from "@/features/messages/messages-shell";
import { getMessageErrorMessage } from "@/features/messages/ui";
import { useConversationRealtime } from "@/features/messages/use-conversation-realtime";

interface PendingReference {
  key: string;
  attachmentType: MessageReferenceAttachmentType;
  targetId: string;
  label: string;
}

export function ConversationPage() {
  const { conversationId = "" } = useParams();
  const viewer = useAppViewer();
  const isOnline = useOnlineStatus();
  const localQueryClient = useQueryClient();
  const [draft, setDraft, clearDraft] = useLocalDraft(
    `mxshare:draft:message:${viewer.userId ?? "guest"}:${conversationId}`,
    "",
  );
  const [search, setSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingReferences, setPendingReferences] = useState<PendingReference[]>([]);
  const [referencePickerOpen, setReferencePickerOpen] = useState(false);
  const [referenceSelection, setReferenceSelection] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [retryMessageId, setRetryMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", viewer.userId],
    queryFn: () => listConversations(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });

  const conversationQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 5_000,
  });
  const conversationsSnapshot = useOfflineSnapshot(
    `mxshare:offline:v2:conversations:${viewer.userId ?? "guest"}`,
    conversationsQuery.data,
  );
  const conversationRailItems =
    conversationsQuery.data ?? (!isOnline ? conversationsSnapshot : null) ?? [];
  const projectOptionsQuery = useQuery({
    queryKey: ["message-reference-projects", viewer.userId],
    queryFn: () => listProjects(viewer.userId!),
    enabled: Boolean(viewer.userId && referencePickerOpen),
  });
  const postOptionsQuery = useQuery({
    queryKey: ["message-reference-posts", viewer.userId],
    queryFn: () => listResolvedPosts({ ownerId: viewer.userId!, viewerId: viewer.userId }),
    enabled: Boolean(viewer.userId && referencePickerOpen),
  });
  const libraryOptionsQuery = useQuery({
    queryKey: ["message-reference-library", viewer.userId],
    queryFn: () => getLibraryDashboard(viewer.userId!),
    enabled: Boolean(viewer.userId && referencePickerOpen),
  });
  useConversationRealtime(conversationId, viewer.userId, localQueryClient);

  const sendMutation = useMutation({
    mutationFn: async ({
      body,
      files,
      references,
    }: {
      body: string;
      files: File[];
      references: PendingReference[];
    }) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }
      if (!navigator.onLine) {
        throw new Error("Messages and attachments can only be sent while online.");
      }

      const trimmedBody = body.trim();
      if (!trimmedBody && files.length === 0 && references.length === 0) {
        throw new Error("Write a message or attach a file first.");
      }

      const message = retryMessageId
        ? { id: retryMessageId }
        : await sendMessage({
            conversationId,
            senderId: viewer.userId,
            values: { body: trimmedBody },
          });
      setRetryMessageId(message.id);

      const controller = new AbortController();
      uploadControllerRef.current = controller;
      try {
        for (const file of files) {
          await uploadMessageAttachment({
            messageId: message.id,
            file,
            signal: controller.signal,
            onProgress: (progress) => setUploadProgress((current) => ({
              ...current,
              [`${file.name}:${file.size}`]: progress,
            })),
          });
          setPendingFiles((current) => current.filter((entry) => entry !== file));
        }
        for (const reference of references) {
          await createMessageReferenceAttachment({
            messageId: message.id,
            attachmentType: reference.attachmentType,
            targetId: reference.targetId,
          });
          setPendingReferences((current) => current.filter((entry) => entry.key !== reference.key));
        }
      } finally {
        uploadControllerRef.current = null;
      }

      return message;
    },
    onSuccess: async () => {
      clearDraft();
      setRetryMessageId(null);
      setPendingFiles([]);
      setPendingReferences([]);
      setUploadProgress({});
      await queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations", viewer.userId] });
      await queryClient.invalidateQueries({ queryKey: ["messages-unread", viewer.userId] });
      toast.success("Message sent.");
    },
    onError: (error) => {
      toast.error(
        error instanceof DOMException && error.name === "AbortError"
          ? "Attachment upload cancelled. Retry when you are ready."
          : getMessageErrorMessage(error),
      );
    },
  });
  const deleteMessageMutation = useMutation({
    mutationFn: async (input: {
      messageId: string;
      attachmentIds: string[];
    }) => {
      for (const attachmentId of input.attachmentIds) {
        await deleteMessageAttachment(attachmentId);
      }
      const deleted = await deleteOwnMessage(input.messageId);
      if (!deleted) {
        throw new Error("This message could not be deleted.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations", viewer.userId] });
      toast.success("Message deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this message.");
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
  const project = data?.project ?? null;
  const lastMessageId = data?.messages.at(-1)?.id ?? null;
  const lastMarkedMessageIdRef = useRef<string | null>(null);
  const queryErrorMessage = conversationQuery.error
    ? getMessageErrorMessage(conversationQuery.error)
    : null;
  const messageCount = data?.messages.length ?? 0;
  const publicProfilePath = counterpart?.username ? `/@${counterpart.username}` : null;
  const canSend =
    (draft.trim().length > 0 || pendingFiles.length > 0 || pendingReferences.length > 0) &&
    !sendMutation.isPending &&
    isOnline &&
    !conversationQuery.isPending &&
    !conversationQuery.isError;
  const description = queryErrorMessage
    ? "The conversation could not be loaded correctly. The technical cause is shown below."
    : project
      ? `Project conversation for ${project.title}. Membership and project roles control access to every message and attachment.`
      : counterpart
      ? `Direct conversation with @${counterpart.username}. Read state stays in sync so the inbox can tell you what still needs attention.`
      : "Realtime is additive here. The conversation still works correctly without an active subscription.";
  const referenceOptions = useMemo(() => {
    const projects = (projectOptionsQuery.data ?? []).map((item) => ({
      value: `project_reference:${item.project.id}`,
      label: `Project · ${item.project.title}`,
    }));
    const posts = (postOptionsQuery.data ?? []).map((item) => ({
      value: `post_reference:${item.post.id}`,
      label: `${item.post.post_type.toUpperCase()} · ${item.post.title}`,
    }));
    const songById = new Map((libraryOptionsQuery.data?.songs ?? []).map((song) => [song.id, song]));
    const versions = (libraryOptionsQuery.data?.versions ?? []).map((version) => ({
      value: `song_version_reference:${version.id}`,
      label: `Version · ${songById.get(version.song_id)?.title ?? "Song"} · V${version.version_number} ${version.version_label}`,
    }));
    return [...projects, ...posts, ...versions];
  }, [libraryOptionsQuery.data, postOptionsQuery.data, projectOptionsQuery.data]);

  function addFiles(files: File[]) {
    if (!isOnline) {
      toast.error("Attachment uploads are unavailable offline.");
      return;
    }
    const accepted = files.filter((file) => {
      const kind = getUploadableAttachmentKind(file);
      const limit = kind === "audio" ? 50 * 1024 ** 2 : kind === "image" ? 15 * 1024 ** 2 : 20 * 1024 ** 2;
      if (!kind) {
        toast.error(`${file.name} is not a supported attachment type.`);
        return false;
      }
      if (file.size > limit) {
        toast.error(`${file.name} exceeds the ${kind} attachment limit.`);
        return false;
      }
      return true;
    });
    setPendingFiles((current) => {
      const remaining = Math.max(0, 5 - current.length - pendingReferences.length);
      if (accepted.length > remaining) {
        toast.error("A message can contain at most five attachments.");
      }
      return [...current, ...accepted.slice(0, remaining)];
    });
  }

  function addSelectedReference() {
    const option = referenceOptions.find((entry) => entry.value === referenceSelection);
    if (!option) {
      return;
    }
    if (pendingFiles.length + pendingReferences.length >= 5) {
      toast.error("A message can contain at most five attachments.");
      return;
    }
    if (pendingReferences.some((entry) => entry.key === option.value)) {
      toast.error("This reference is already attached.");
      return;
    }
    const separatorIndex = option.value.indexOf(":");
    setPendingReferences((current) => [
      ...current,
      {
        key: option.value,
        attachmentType: option.value.slice(0, separatorIndex) as MessageReferenceAttachmentType,
        targetId: option.value.slice(separatorIndex + 1),
        label: option.label,
      },
    ]);
    setReferenceSelection("");
    setReferencePickerOpen(false);
  }

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
        title={project?.title ?? counterpart?.display_name ?? "Direct message"}
        description={description}
      />

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <div className="hidden min-w-0 2xl:block">
          <ConversationRail
            items={conversationRailItems}
            search={search}
            onSearchChange={setSearch}
            selectedConversationId={conversationId}
            title="Messages"
            description="Search the inbox, jump between threads, and keep feedback close to the release context."
          />
        </div>

        <Card className="flex min-h-[58dvh] min-w-0 flex-col overflow-hidden p-0 sm:min-h-[68vh]">
          <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
            {counterpart || project ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    alt={project?.title ?? counterpart?.display_name ?? "Conversation"}
                    initials={(project?.title ?? counterpart?.display_name ?? "MX").slice(0, 2).toUpperCase()}
                    className="size-14"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="truncate font-display text-2xl tracking-[-0.03em] sm:text-3xl">
                        {project?.title ?? counterpart?.display_name}
                      </p>
                      <Badge variant="accent">{project ? "Project room" : "Direct thread"}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {project ? `${data?.members.length ?? 0} members` : `@${counterpart?.username}`}
                    </p>
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

          <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
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
              const sender = data.members.find((member) => member.id === message.sender_id);
              const attachments = data.attachments.filter((attachment) => attachment.message_id === message.id);
              return (
                <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`flex min-w-0 max-w-[92%] items-end gap-2 sm:max-w-[78%] sm:gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                    {!isOwn && sender ? (
                      <Avatar
                        alt={sender.display_name}
                        initials={sender.display_name.slice(0, 2).toUpperCase()}
                        className="size-10"
                      />
                    ) : null}
                    <div
                      className={isOwn
                        ? "min-w-0 max-w-full rounded-[26px] rounded-br-[10px] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.98),var(--accent-strong))] px-4 py-3 text-white shadow-[0_20px_42px_rgba(var(--accent-rgb),0.28)]"
                        : "min-w-0 max-w-full rounded-[26px] rounded-bl-[10px] border border-white/[0.08] bg-white/[0.04] px-4 py-3"}
                    >
                      {!isOwn && sender ? (
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-accent-secondary/80">
                          {sender.display_name}
                        </p>
                      ) : null}
                      {message.deleted_at ? (
                        <p className={`text-sm italic ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                          Message deleted
                        </p>
                      ) : message.body ? (
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-7 [overflow-wrap:anywhere]">{message.body}</p>
                      ) : null}
                      {attachments.map((attachment) => (
                        <MessageAttachmentCard
                          key={attachment.id}
                          attachment={attachment}
                          asset={data.attachmentAssets.find(
                            (asset) => asset.id === attachment.protected_asset_id,
                          ) ?? null}
                          conversationId={conversationId}
                          isOwn={isOwn}
                        />
                      ))}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className={`text-xs ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                          {formatRelativeTime(message.created_at)}
                        </p>
                        {isOwn && !message.deleted_at ? (
                          <button
                            type="button"
                            className="rounded-full p-1 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Delete message"
                            disabled={!isOnline || deleteMessageMutation.isPending}
                            onClick={() => {
                              if (!window.confirm("Delete this message and all of its attachments?")) {
                                return;
                              }
                              deleteMessageMutation.mutate({
                                messageId: message.id,
                                attachmentIds: attachments.map((attachment) => attachment.id),
                              });
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="min-w-0 border-t border-white/[0.06] px-3 py-4 sm:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMutation.mutateAsync({
                body: draft,
                files: pendingFiles,
                references: pendingReferences,
              });
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(Array.from(event.dataTransfer.files));
            }}
          >
            {referencePickerOpen ? (
              <div className="mb-3 flex flex-col gap-2 rounded-[18px] border border-accent/20 bg-accent/8 p-3 sm:flex-row">
                <Select
                  value={referenceSelection}
                  onChange={(event) => setReferenceSelection(event.currentTarget.value)}
                  className="min-w-0 flex-1"
                >
                  <option value="">Choose one of your accessible projects, releases, or versions</option>
                  {referenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!referenceSelection}
                  onClick={addSelectedReference}
                >
                  Add reference
                </Button>
              </div>
            ) : null}
            {pendingFiles.length || pendingReferences.length ? (
              <div className="mb-3 space-y-2">
                {retryMessageId ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-warning/20 bg-warning/8 px-3 py-2 text-xs text-warning">
                    <span>The message exists. Retry uploads without sending a duplicate message.</span>
                    {sendMutation.isPending ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => uploadControllerRef.current?.abort()}
                      >
                        Cancel upload
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                {pendingReferences.map((reference) => (
                  <div key={reference.key} className="min-w-0 max-w-full flex-1 basis-44 rounded-[16px] border border-accent/18 bg-accent/8 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="size-4 text-accent-secondary" />
                      <span className="min-w-0 flex-1 truncate text-xs">{reference.label}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${reference.label}`}
                        onClick={() => setPendingReferences((current) => current.filter((entry) => entry.key !== reference.key))}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingFiles.map((file, index) => {
                  const key = `${file.name}:${file.size}`;
                  const kind = getUploadableAttachmentKind(file);
                  return (
                    <div key={`${key}:${index}`} className="min-w-0 max-w-full flex-1 basis-44 rounded-[16px] border border-border bg-white/[0.035] px-3 py-2">
                      <div className="flex items-center gap-2">
                        {kind === "audio" ? <FileAudio className="size-4 text-accent-secondary" /> : null}
                        {kind === "image" ? <Image className="size-4 text-accent-secondary" /> : null}
                        {kind === "document" ? <Paperclip className="size-4 text-accent-secondary" /> : null}
                        <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      {sendMutation.isPending ? (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-accent transition-[width]"
                            style={{ width: `${uploadProgress[key] ?? 0}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                </div>
              </div>
            ) : null}
            <div className="grid min-w-0 gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="audio/*,image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.md"
                onChange={(event) => {
                  addFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3"
                  aria-label="Attach media"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOnline || pendingFiles.length + pendingReferences.length >= 5 || sendMutation.isPending}
                >
                  <Paperclip className="size-4" />
                  Media
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3"
                  aria-label="Attach MxShare reference"
                  onClick={() => setReferencePickerOpen((current) => !current)}
                  disabled={!isOnline || pendingFiles.length + pendingReferences.length >= 5 || sendMutation.isPending}
                >
                  <Link2 className="size-4" />
                  Reference
                </Button>
              </div>
              <div className="flex min-w-0 gap-2 sm:gap-3">
                <Input
                  className="min-w-0 flex-1"
                  value={draft}
                  placeholder={isOnline ? "Write a message" : "Draft saved until you reconnect"}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                />
                <Button type="submit" disabled={!canSend} className="shrink-0 px-4 sm:min-w-28">
                  <SendHorizonal className="size-4" />
                  <span className="hidden sm:inline">{retryMessageId ? "Retry" : "Send"}</span>
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <div className="hidden space-y-6 2xl:block">
          <Card>
            <div className="rounded-[28px] border border-accent/16 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.22),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0.01))] p-5">
              <div className="flex items-center gap-4">
                <Avatar
                  alt={project?.title ?? counterpart?.display_name ?? "Conversation"}
                  initials={(project?.title ?? counterpart?.display_name ?? "DM").slice(0, 2).toUpperCase()}
                  className="size-16 text-base"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-3xl tracking-[-0.03em]">
                    {project?.title ?? counterpart?.display_name ?? "Direct thread"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {project ? "Project collaboration room" : counterpart?.username ? `@${counterpart.username}` : "Waiting for participant details"}
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

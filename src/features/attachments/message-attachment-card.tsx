import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Image,
  MessageSquareShare,
  Music2,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { Waveform } from "@/components/audio/waveform";
import { usePlayerStore } from "@/components/audio/player-store";
import { Button } from "@/components/ui/button";
import {
  deleteMessageAttachment,
  getMessageReferenceTarget,
  getMessageAttachmentReadUrl,
} from "@/features/attachments/api";
import { queryClient } from "@/lib/query-client";
import { formatDuration } from "@/lib/utils";
import { normalizeWaveformData } from "@/lib/waveform";
import type { MessageAttachment, ProtectedMediaAsset } from "@/types/domain";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function MessageAttachmentCard({
  attachment,
  asset,
  conversationId,
  isOwn,
}: {
  attachment: MessageAttachment;
  asset: ProtectedMediaAsset | null;
  conversationId: string;
  isOwn: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const enqueue = usePlayerStore((state) => state.enqueue);
  const readUrlQuery = useQuery({
    queryKey: ["message-attachment-url", attachment.id],
    queryFn: () => getMessageAttachmentReadUrl(attachment),
    enabled: attachment.attachment_type === "image",
    staleTime: 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    refetchOnWindowFocus: "always",
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteMessageAttachment(attachment.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      toast.success("Attachment removed.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove the attachment."),
  });
  const openMutation = useMutation({
    mutationFn: () => getMessageAttachmentReadUrl(attachment),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not open the attachment."),
  });
  const waveform = normalizeWaveformData(asset?.waveform_data);
  const isReference = attachment.attachment_type.endsWith("_reference");
  const referenceQuery = useQuery({
    queryKey: ["message-reference", attachment.id],
    queryFn: () => getMessageReferenceTarget(attachment),
    enabled: isReference,
  });

  async function playAudio() {
    const url = await openMutation.mutateAsync();
    enqueue([
      {
        id: `attachment:${attachment.id}`,
        title: attachment.filename,
        artistName: "Conversation attachment",
        src: url,
        durationSeconds: attachment.duration_seconds,
        waveform,
        queueGroupLabel: "Messages",
      },
    ]);
  }

  async function openDocument() {
    const url = await openMutation.mutateAsync();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-[18px] border border-white/12 bg-black/15">
        {isReference ? (
          referenceQuery.data ? (
            <Link
              to={referenceQuery.data.to}
              className="flex items-center gap-3 p-3 transition-colors hover:bg-white/6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-accent/18 text-accent-secondary">
                {attachment.attachment_type === "project_reference" ? (
                  <FolderKanban className="size-5" />
                ) : attachment.attachment_type === "post_reference" ? (
                  <MessageSquareShare className="size-5" />
                ) : (
                  <Music2 className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{referenceQuery.data.title}</span>
                <span className="mt-1 block text-xs text-white/60">{referenceQuery.data.subtitle}</span>
              </span>
              <ExternalLink className="size-4 shrink-0" />
            </Link>
          ) : (
            <div className="flex min-h-16 items-center gap-3 p-3 text-sm text-white/65">
              <FolderKanban className="size-4" />
              {referenceQuery.isError ? "Reference unavailable" : "Loading reference…"}
            </div>
          )
        ) : attachment.attachment_type === "image" ? (
          <button
            type="button"
            className="block w-full"
            onClick={() => setLightboxOpen(true)}
            disabled={!readUrlQuery.data}
          >
            {readUrlQuery.data ? (
              <img
                src={readUrlQuery.data}
                alt={attachment.filename}
                className="max-h-72 w-full object-cover"
                onError={() => {
                  void readUrlQuery.refetch();
                }}
              />
            ) : (
              <span className="flex h-32 items-center justify-center text-sm text-white/65">
                <Image className="mr-2 size-4" />
                Preparing image…
              </span>
            )}
          </button>
        ) : attachment.attachment_type === "audio" ? (
          <div className="p-3">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="size-10 shrink-0 rounded-full p-0"
                aria-label={`Play ${attachment.filename}`}
                onClick={() => void playAudio()}
                disabled={openMutation.isPending}
              >
                <Play className="size-4 fill-current" />
              </Button>
              <Waveform
                waveform={waveform}
                durationSeconds={attachment.duration_seconds}
                disabled
                showFallbackLine
                className="h-12 min-w-0 flex-1"
                trackClassName="rounded-[12px]"
              />
              <span className="text-xs text-white/65">{formatDuration(attachment.duration_seconds)}</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-3 p-3 text-left"
            onClick={() => void openDocument()}
          >
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-white/8">
              <FileText className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{attachment.filename}</span>
              <span className="mt-1 block text-xs text-white/60">{formatBytes(attachment.bytes)}</span>
            </span>
            <Download className="size-4" />
          </button>
        )}

        <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-xs text-white/60">
            {attachment.attachment_type === "audio" ? <Music2 className="size-3.5" /> : null}
            {attachment.attachment_type === "image" ? <Image className="size-3.5" /> : null}
            {attachment.attachment_type === "document" ? <FileText className="size-3.5" /> : null}
            {isReference ? <FolderKanban className="size-3.5" /> : null}
            <span className="truncate">{attachment.filename}</span>
            {!isReference ? <span>· {formatBytes(attachment.bytes)}</span> : null}
          </span>
          {isOwn ? (
            <button
              type="button"
              className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-white/8 hover:text-white"
              aria-label={`Delete ${attachment.filename}`}
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {lightboxOpen && readUrlQuery.data ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-5 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label={attachment.filename}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute right-6 top-6 rounded-full border border-white/15 bg-black/40 p-3 text-white"
            aria-label="Close image"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="size-5" />
          </button>
          <img
            src={readUrlQuery.data}
            alt={attachment.filename}
            className="max-h-full max-w-full rounded-[24px] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

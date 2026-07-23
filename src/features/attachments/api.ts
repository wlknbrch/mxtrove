import { createProtectedMediaReadUrl } from "@/features/media-processing/api";
import { env } from "@/lib/env";
import { requireSupabase } from "@/lib/service-utils";
import type { MessageAttachment } from "@/types/domain";

export type MessageReferenceAttachmentType =
  | "project_reference"
  | "post_reference"
  | "song_version_reference";

export interface MessageReferenceTarget {
  title: string;
  subtitle: string;
  to: string;
}

export type UploadableAttachmentKind = "audio" | "image" | "document";

async function getAccessToken() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("Please sign in before uploading an attachment.");
  }
  return data.session.access_token;
}

export function getUploadableAttachmentKind(file: File): UploadableAttachmentKind | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") return "image";
  if (
    file.type === "application/pdf"
    || file.type === "text/plain"
    || extension === "pdf"
    || extension === "txt"
    || extension === "md"
  ) {
    return "document";
  }
  return null;
}

export async function uploadMessageAttachment(input: {
  messageId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  const accessToken = await getAccessToken();
  const kind = getUploadableAttachmentKind(input.file);
  if (!kind) {
    throw new Error("Only audio, raster images, PDF, TXT, and Markdown attachments are supported.");
  }

  return new Promise<MessageAttachment>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `${env.mediaWorkerUrl}/v1/messages/${encodeURIComponent(input.messageId)}/attachments`,
    );
    request.responseType = "json";
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("Content-Type", input.file.type || "application/octet-stream");
    request.setRequestHeader("X-MxShare-Filename", encodeURIComponent(input.file.name));
    request.setRequestHeader("X-MxShare-Attachment-Type", kind);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () =>
      reject(
        new Error(
          `The attachment upload could not reach the media worker at ${env.mediaWorkerUrl}. Check that the worker is running and that its APP_ORIGIN allows your current frontend URL.`,
        ),
      );
    request.onabort = () => reject(new DOMException("Attachment upload aborted.", "AbortError"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response as MessageAttachment);
        return;
      }
      const message = typeof request.response?.error === "string"
        ? request.response.error
        : request.responseText;
      reject(new Error(message || `Attachment upload failed with status ${request.status}.`));
    };
    if (input.signal) {
      input.signal.addEventListener("abort", () => request.abort(), { once: true });
    }
    request.send(input.file);
  });
}

export async function deleteMessageAttachment(attachmentId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${env.mediaWorkerUrl}/v1/message-attachments/${encodeURIComponent(attachmentId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(await response.text() || "Could not delete the attachment.");
  }
}

export async function getMessageAttachmentReadUrl(attachment: MessageAttachment) {
  if (!attachment.protected_asset_id) {
    throw new Error("This attachment has no protected media derivative.");
  }
  return createProtectedMediaReadUrl(attachment.protected_asset_id);
}

export async function createMessageReferenceAttachment(input: {
  messageId: string;
  attachmentType: MessageReferenceAttachmentType;
  targetId: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_message_reference_attachment", {
    target_message_id: input.messageId,
    target_attachment_type: input.attachmentType,
    target_id: input.targetId,
  });
  if (error) throw error;
  return data as MessageAttachment;
}

export async function getMessageReferenceTarget(
  attachment: MessageAttachment,
): Promise<MessageReferenceTarget> {
  const client = requireSupabase();

  if (attachment.attachment_type === "project_reference" && attachment.project_id) {
    const { data, error } = await client
      .from("collaboration_projects")
      .select("id, title, status")
      .eq("id", attachment.project_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This project is no longer available.");
    return {
      title: data.title,
      subtitle: `${data.status} collaboration project`,
      to: `/projects/${data.id}`,
    };
  }

  if (attachment.attachment_type === "post_reference" && attachment.post_id) {
    const { data, error } = await client
      .from("posts")
      .select("id, title, post_type")
      .eq("id", attachment.post_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This release is no longer available.");
    return {
      title: data.title,
      subtitle: `${data.post_type} release`,
      to: `/post/${data.id}`,
    };
  }

  if (attachment.attachment_type === "song_version_reference" && attachment.song_version_id) {
    const { data: version, error: versionError } = await client
      .from("song_versions")
      .select("id, song_id, version_number, version_label")
      .eq("id", attachment.song_version_id)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version) throw new Error("This song version is no longer available.");
    const { data: song, error: songError } = await client
      .from("songs")
      .select("id, title")
      .eq("id", version.song_id)
      .maybeSingle();
    if (songError) throw songError;
    if (!song) throw new Error("This song is no longer available.");
    return {
      title: song.title,
      subtitle: `V${version.version_number} · ${version.version_label}`,
      to: `/library/songs/${song.id}`,
    };
  }

  throw new Error("This message reference is invalid.");
}

import { demoConversation, demoMessages, demoProfiles, demoViewerProfile } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { MessageFormValues } from "@/lib/validators";
import type {
  CollaborationProject,
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  Profile,
  ProtectedMediaAsset,
} from "@/types/domain";

export interface ConversationPreview {
  conversation: Conversation;
  counterpart: Profile | null;
  project: CollaborationProject | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface UnreadConversationSummary {
  unreadConversations: number;
  unreadMessages: number;
}

function throwMessageError(error: { message?: string } | null) {
  if (!error) {
    return;
  }

  throw new Error(error.message || "Messaging request failed.");
}

function isUnreadMessage(createdAt: string, lastReadAt: string | null | undefined) {
  if (!lastReadAt) {
    return true;
  }

  return new Date(createdAt).getTime() > new Date(lastReadAt).getTime();
}

export async function listConversations(viewerId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return [
      {
        conversation: demoConversation,
        counterpart: demoProfiles[1],
        project: null,
        lastMessage: demoMessages[demoMessages.length - 1],
        unreadCount: 1,
      },
    ] satisfies ConversationPreview[];
  }

  const client = requireSupabase();
  const { data: memberships, error } = await client
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("profile_id", viewerId);

  throwMessageError(error);

  const membershipRows = (memberships ?? []) as Array<Pick<ConversationMember, "conversation_id" | "last_read_at">>;
  const membershipByConversationId = new Map(
    membershipRows.map((membership) => [membership.conversation_id, membership]),
  );
  const conversationIds = membershipRows.map((membership) => membership.conversation_id);

  if (!conversationIds.length) {
    return [];
  }

  const [conversations, members, messages] = await Promise.all([
    client.from("conversations").select("*").in("id", conversationIds),
    client.from("conversation_members").select("*").in("conversation_id", conversationIds),
    client.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: true }),
  ]);

  throwMessageError(conversations.error);
  throwMessageError(members.error);
  throwMessageError(messages.error);
  const conversationRows = (conversations.data ?? []) as Conversation[];
  const projectIds = conversationRows
    .map((conversation) => conversation.project_id)
    .filter((projectId): projectId is string => Boolean(projectId));
  const { data: projects, error: projectsError } = projectIds.length
    ? await client.from("collaboration_projects").select("*").in("id", projectIds)
    : { data: [], error: null };
  throwMessageError(projectsError);

  const otherProfileIds = Array.from(
    new Set(
      ((members.data ?? []) as Array<{ profile_id: string }>).map((member) => member.profile_id).filter((id) => id !== viewerId),
    ),
  );
  const { data: profiles, error: profileError } = otherProfileIds.length
    ? await client.from("profiles").select("*").in("id", otherProfileIds)
    : { data: [], error: null };

  throwMessageError(profileError);

  return conversationRows
    .map((conversation) => {
      const memberEntries = ((members.data ?? []) as Array<{ conversation_id: string; profile_id: string }>).filter(
        (member) => member.conversation_id === conversation.id && member.profile_id !== viewerId,
      );
      const conversationMessages = ((messages.data ?? []) as Message[]).filter(
        (message) => message.conversation_id === conversation.id,
      );
      const lastMessage = conversationMessages.at(-1) ?? null;
      const unreadCount = conversationMessages.filter(
        (message) =>
          message.sender_id !== viewerId &&
          isUnreadMessage(message.created_at, membershipByConversationId.get(conversation.id)?.last_read_at),
      ).length;

      return {
        conversation,
        project: ((projects ?? []) as CollaborationProject[]).find(
          (project) => project.id === conversation.project_id,
        ) ?? null,
        counterpart:
          ((profiles ?? []) as Profile[]).find((profile) => profile.id === memberEntries[0]?.profile_id) ?? null,
        lastMessage,
        unreadCount,
      };
    })
    .sort((left, right) => {
      const leftTimestamp = left.lastMessage?.created_at ?? left.conversation.updated_at ?? left.conversation.created_at;
      const rightTimestamp = right.lastMessage?.created_at ?? right.conversation.updated_at ?? right.conversation.created_at;
      return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
    }) satisfies ConversationPreview[];
}

export async function getConversation(conversationId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return {
      conversation: demoConversation,
      messages: demoMessages,
      attachments: [] as MessageAttachment[],
      attachmentAssets: [] as ProtectedMediaAsset[],
      members: [demoViewerProfile, demoProfiles[1]],
      project: null as CollaborationProject | null,
    };
  }

  const client = requireSupabase();
  const [conversation, members, messages] = await Promise.all([
    client.from("conversations").select("*").eq("id", conversationId).maybeSingle(),
    client.from("conversation_members").select("*").eq("conversation_id", conversationId),
    client.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }),
  ]);

  throwMessageError(conversation.error);
  throwMessageError(members.error);
  throwMessageError(messages.error);
  const messageRows = (messages.data ?? []) as Message[];
  const messageIds = messageRows.map((message) => message.id);
  const { data: attachments, error: attachmentsError } = messageIds.length
    ? await client
        .from("message_attachments")
        .select("*")
        .in("message_id", messageIds)
        .is("deleted_at", null)
        .order("created_at")
    : { data: [], error: null };
  throwMessageError(attachmentsError);
  const protectedAssetIds = ((attachments ?? []) as MessageAttachment[])
    .map((attachment) => attachment.protected_asset_id)
    .filter((assetId): assetId is string => Boolean(assetId));
  const { data: attachmentAssets, error: attachmentAssetsError } = protectedAssetIds.length
    ? await client
        .from("protected_media_assets")
        .select("*")
        .in("id", protectedAssetIds)
        .eq("status", "ready")
        .is("deleted_at", null)
    : { data: [], error: null };
  throwMessageError(attachmentAssetsError);

  const conversationRow = conversation.data as Conversation | null;
  const { data: project, error: projectError } = conversationRow?.project_id
    ? await client
        .from("collaboration_projects")
        .select("*")
        .eq("id", conversationRow.project_id)
        .maybeSingle()
    : { data: null, error: null };
  throwMessageError(projectError);

  const profileIds = ((members.data ?? []) as Array<{ profile_id: string }>).map((member) => member.profile_id);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await client.from("profiles").select("*").in("id", profileIds)
    : { data: [], error: null };

  throwMessageError(profilesError);

  return {
    conversation: conversationRow,
    messages: messageRows,
    attachments: (attachments ?? []) as MessageAttachment[],
    attachmentAssets: (attachmentAssets ?? []) as ProtectedMediaAsset[],
    members: (profiles ?? []) as Profile[],
    project: project as CollaborationProject | null,
  };
}

export async function createDirectConversation(input: { otherProfileId: string }) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return demoConversation.id;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("create_direct_conversation", {
    other_profile_id: input.otherProfileId,
  });

  throwMessageError(error);

  return data as string;
}

export async function getUnreadConversationSummary(viewerId: string): Promise<UnreadConversationSummary> {
  if (isDemoModeEnabled()) {
    await createDemoDelay(120);
    return {
      unreadConversations: 1,
      unreadMessages: 1,
    };
  }

  const client = requireSupabase();
  const { data: memberships, error } = await client
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("profile_id", viewerId);

  throwMessageError(error);

  const membershipRows = (memberships ?? []) as Array<Pick<ConversationMember, "conversation_id" | "last_read_at">>;
  const conversationIds = membershipRows.map((membership) => membership.conversation_id);

  if (!conversationIds.length) {
    return {
      unreadConversations: 0,
      unreadMessages: 0,
    };
  }

  const { data: messages, error: messagesError } = await client
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", conversationIds);

  throwMessageError(messagesError);

  const unreadByConversation = new Map<string, number>();
  const membershipByConversationId = new Map(
    membershipRows.map((membership) => [membership.conversation_id, membership]),
  );
  membershipRows.forEach((membership) => {
    unreadByConversation.set(membership.conversation_id, 0);
  });

  ((messages ?? []) as Array<Pick<Message, "conversation_id" | "sender_id" | "created_at">>).forEach((message) => {
    const membership = membershipByConversationId.get(message.conversation_id);
    if (!membership || message.sender_id === viewerId) {
      return;
    }

    if (isUnreadMessage(message.created_at, membership.last_read_at)) {
      unreadByConversation.set(message.conversation_id, (unreadByConversation.get(message.conversation_id) ?? 0) + 1);
    }
  });

  const unreadCounts = Array.from(unreadByConversation.values());
  return {
    unreadConversations: unreadCounts.filter((count) => count > 0).length,
    unreadMessages: unreadCounts.reduce((sum, count) => sum + count, 0),
  };
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  values: MessageFormValues;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return {
      ...demoMessages[0],
      id: crypto.randomUUID(),
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.values.body,
      created_at: new Date().toISOString(),
    } satisfies Message;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.values.body,
    })
    .select("*")
    .single();

  throwMessageError(error);
  return data as Message;
}

export async function markConversationRead(conversationId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.rpc("mark_conversation_read", {
    target_conversation_id: conversationId,
  });

  throwMessageError(error);
}

export async function deleteOwnMessage(messageId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(100);
    return true;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("delete_own_message", {
    target_message_id: messageId,
  });
  throwMessageError(error);
  return Boolean(data);
}

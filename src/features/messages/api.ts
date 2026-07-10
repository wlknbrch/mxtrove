import { demoConversation, demoMessages, demoProfiles, demoViewerProfile } from "@/lib/demo-data";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type { MessageFormValues } from "@/lib/validators";
import type { Conversation, Message, Profile } from "@/types/domain";

export interface ConversationPreview {
  conversation: Conversation;
  counterpart: Profile | null;
  lastMessage: Message | null;
}

function throwMessageError(error: { message?: string } | null) {
  if (!error) {
    return;
  }

  throw new Error(error.message || "Messaging request failed.");
}

export async function listConversations(viewerId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return [
      {
        conversation: demoConversation,
        counterpart: demoProfiles[1],
        lastMessage: demoMessages[demoMessages.length - 1],
      },
    ] satisfies ConversationPreview[];
  }

  const client = requireSupabase();
  const { data: memberships, error } = await client
    .from("conversation_members")
    .select("conversation_id")
    .eq("profile_id", viewerId);

  throwMessageError(error);

  const conversationIds = ((memberships ?? []) as Array<{ conversation_id: string }>).map(
    (membership) => membership.conversation_id,
  );

  const [conversations, members, messages] = await Promise.all([
    conversationIds.length
      ? client.from("conversations").select("*").in("id", conversationIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? client.from("conversation_members").select("*").in("conversation_id", conversationIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? client.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwMessageError(conversations.error);
  throwMessageError(members.error);
  throwMessageError(messages.error);

  const otherProfileIds = Array.from(
    new Set(
      ((members.data ?? []) as Array<{ profile_id: string }>).map((member) => member.profile_id).filter((id) => id !== viewerId),
    ),
  );
  const { data: profiles, error: profileError } = otherProfileIds.length
    ? await client.from("profiles").select("*").in("id", otherProfileIds)
    : { data: [], error: null };

  throwMessageError(profileError);

  return ((conversations.data ?? []) as Conversation[]).map((conversation) => {
    const memberEntries = ((members.data ?? []) as Array<{ conversation_id: string; profile_id: string }>).filter(
      (member) => member.conversation_id === conversation.id && member.profile_id !== viewerId,
    );
    const lastMessage =
      ((messages.data ?? []) as Message[]).filter((message) => message.conversation_id === conversation.id).at(-1) ?? null;

    return {
      conversation,
      counterpart:
        ((profiles ?? []) as Profile[]).find((profile) => profile.id === memberEntries[0]?.profile_id) ?? null,
      lastMessage,
    };
  }) satisfies ConversationPreview[];
}

export async function getConversation(conversationId: string) {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return {
      conversation: demoConversation,
      messages: demoMessages,
      members: [demoViewerProfile, demoProfiles[1]],
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

  const profileIds = ((members.data ?? []) as Array<{ profile_id: string }>).map((member) => member.profile_id);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await client.from("profiles").select("*").in("id", profileIds)
    : { data: [], error: null };

  throwMessageError(profilesError);

  return {
    conversation: conversation.data as Conversation | null,
    messages: (messages.data ?? []) as Message[],
    members: (profiles ?? []) as Profile[],
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

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  values: MessageFormValues;
}) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(150);
    return;
  }

  const client = requireSupabase();
  const { error } = await client.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.values.body,
  });

  throwMessageError(error);
}

import { createProtectedMediaReadUrl } from "@/features/media-processing/api";
import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";
import type {
  Asset,
  CollaborationActivity,
  CollaborationProject,
  CollaborationProjectMember,
  CollaborationProjectStatus,
  CollaborationProjectTrack,
  CollaborationProjectType,
  CollaborationProjectVisibility,
  CollaborationRole,
  FeedbackReply,
  FeedbackReaction,
  FeedbackThread,
  Profile,
  ProtectedMediaAsset,
  ShareLink,
  Song,
  SongVersion,
} from "@/types/domain";

export interface ProjectDashboardItem {
  project: CollaborationProject;
  viewerRole: CollaborationRole;
  members: Array<{ member: CollaborationProjectMember; profile: Profile | null }>;
  lastActivity: CollaborationActivity | null;
  openFeedbackCount: number;
}

export interface ProjectDetail {
  project: CollaborationProject;
  viewerRole: CollaborationRole;
  tracks: CollaborationProjectTrack[];
  members: Array<{ member: CollaborationProjectMember; profile: Profile | null }>;
  songs: Song[];
  versions: SongVersion[];
  assets: Asset[];
  protectedAssets: ProtectedMediaAsset[];
  feedbackThreads: FeedbackThread[];
  feedbackReplies: FeedbackReply[];
  feedbackReactions: FeedbackReaction[];
  versionHearts: Array<{ song_version_id: string; profile_id: string }>;
  activity: CollaborationActivity[];
  conversationId: string | null;
}

function throwIfError(error: { message?: string } | null) {
  if (error) {
    throw new Error(error.message || "Project request failed.");
  }
}

export async function listProjects(viewerId: string): Promise<ProjectDashboardItem[]> {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return [];
  }

  const client = requireSupabase();
  const membershipsResult = await client
    .from("collaboration_project_members")
    .select("*")
    .eq("profile_id", viewerId)
    .eq("membership_status", "accepted");
  throwIfError(membershipsResult.error);
  const memberships = (membershipsResult.data ?? []) as CollaborationProjectMember[];
  const projectIds = memberships.map((member) => member.project_id);
  if (!projectIds.length) {
    return [];
  }

  const [projectsResult, membersResult, activityResult, feedbackResult] = await Promise.all([
    client.from("collaboration_projects").select("*").in("id", projectIds).order("updated_at", { ascending: false }),
    client.from("collaboration_project_members").select("*").in("project_id", projectIds).eq("membership_status", "accepted"),
    client.from("collaboration_activity").select("*").in("project_id", projectIds).order("created_at", { ascending: false }),
    client.from("feedback_threads").select("id, project_id, status").in("project_id", projectIds).neq("status", "resolved"),
  ]);
  [projectsResult.error, membersResult.error, activityResult.error, feedbackResult.error].forEach(throwIfError);

  const memberRows = (membersResult.data ?? []) as CollaborationProjectMember[];
  const profileIds = Array.from(new Set(memberRows.map((member) => member.profile_id)));
  const profilesResult = profileIds.length
    ? await client.from("profiles").select("*").in("id", profileIds)
    : { data: [], error: null };
  throwIfError(profilesResult.error);
  const profiles = (profilesResult.data ?? []) as Profile[];
  const activity = (activityResult.data ?? []) as CollaborationActivity[];
  const feedback = (feedbackResult.data ?? []) as Array<Pick<FeedbackThread, "id" | "project_id" | "status">>;

  return ((projectsResult.data ?? []) as CollaborationProject[]).map((project) => ({
    project,
    viewerRole: memberships.find((member) => member.project_id === project.id)?.role ?? "viewer",
    members: memberRows
      .filter((member) => member.project_id === project.id)
      .map((member) => ({
        member,
        profile: profiles.find((profile) => profile.id === member.profile_id) ?? null,
      })),
    lastActivity: activity.find((entry) => entry.project_id === project.id) ?? null,
    openFeedbackCount: feedback.filter((thread) => thread.project_id === project.id).length,
  }));
}

export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  if (isDemoModeEnabled()) {
    await createDemoDelay();
    return null;
  }

  const client = requireSupabase();
  const [
    projectResult,
    membersResult,
    tracksResult,
    activityResult,
    feedbackResult,
    conversationResult,
  ] = await Promise.all([
    client.from("collaboration_projects").select("*").eq("id", projectId).maybeSingle(),
    client.from("collaboration_project_members").select("*").eq("project_id", projectId).eq("membership_status", "accepted"),
    client.from("collaboration_project_tracks").select("*").eq("project_id", projectId).order("track_number"),
    client.from("collaboration_activity").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(200),
    client.from("feedback_threads").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    client.from("conversations").select("id").eq("project_id", projectId).eq("kind", "project").maybeSingle(),
  ]);
  [
    projectResult.error,
    membersResult.error,
    tracksResult.error,
    activityResult.error,
    feedbackResult.error,
    conversationResult.error,
  ].forEach(throwIfError);

  const project = projectResult.data as CollaborationProject | null;
  if (!project) {
    return null;
  }

  const members = (membersResult.data ?? []) as CollaborationProjectMember[];
  const tracks = (tracksResult.data ?? []) as CollaborationProjectTrack[];
  const feedbackThreads = (feedbackResult.data ?? []) as FeedbackThread[];
  const profileIds = Array.from(new Set([
    ...members.map((member) => member.profile_id),
    ...feedbackThreads.map((thread) => thread.author_id),
    ...((activityResult.data ?? []) as CollaborationActivity[])
      .map((entry) => entry.actor_id)
      .filter((profileId): profileId is string => Boolean(profileId)),
  ]));
  const songIds = Array.from(new Set(tracks.map((track) => track.song_id)));
  const threadIds = feedbackThreads.map((thread) => thread.id);

  const versionsResult = songIds.length
    ? await client.from("song_versions").select("*").in("song_id", songIds).order("version_number", { ascending: false })
    : { data: [], error: null };
  throwIfError(versionsResult.error);
  const versions = (versionsResult.data ?? []) as SongVersion[];
  const previewAssetIds = Array.from(new Set(
    versions
      .map((version) => version.preview_asset_id)
      .filter((assetId): assetId is string => Boolean(assetId)),
  ));

  const [profilesResult, songsResult, assetsResult, repliesResult, reactionsResult, heartsResult, protectedResult] = await Promise.all([
    profileIds.length ? client.from("profiles").select("*").in("id", profileIds) : Promise.resolve({ data: [], error: null }),
    songIds.length ? client.from("songs").select("*").in("id", songIds) : Promise.resolve({ data: [], error: null }),
    previewAssetIds.length
      ? client.from("assets").select("*").in("id", previewAssetIds)
      : Promise.resolve({ data: [], error: null }),
    threadIds.length
      ? client.from("feedback_replies").select("*").in("thread_id", threadIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    threadIds.length
      ? client.from("feedback_reactions").select("*").in("thread_id", threadIds)
      : Promise.resolve({ data: [], error: null }),
    versions.length
      ? client.from("version_hearts").select("song_version_id, profile_id").in("song_version_id", versions.map((version) => version.id))
      : Promise.resolve({ data: [], error: null }),
    client.from("protected_media_assets").select("*").eq("project_id", projectId).eq("status", "ready").is("deleted_at", null),
  ]);
  [
    profilesResult.error,
    songsResult.error,
    assetsResult.error,
    repliesResult.error,
    reactionsResult.error,
    heartsResult.error,
    protectedResult.error,
  ].forEach(throwIfError);
  const profiles = (profilesResult.data ?? []) as Profile[];

  const { data: userData } = await client.auth.getUser();
  const viewerRole = members.find((member) => member.profile_id === userData.user?.id)?.role ?? "viewer";

  return {
    project,
    viewerRole,
    tracks,
    members: members.map((member) => ({
      member,
      profile: profiles.find((profile) => profile.id === member.profile_id) ?? null,
    })),
    songs: (songsResult.data ?? []) as Song[],
    versions,
    assets: (assetsResult.data ?? []) as Asset[],
    protectedAssets: (protectedResult.data ?? []) as ProtectedMediaAsset[],
    feedbackThreads,
    feedbackReplies: (repliesResult.data ?? []) as FeedbackReply[],
    feedbackReactions: (reactionsResult.data ?? []) as FeedbackReaction[],
    versionHearts: (heartsResult.data ?? []) as Array<{ song_version_id: string; profile_id: string }>,
    activity: (activityResult.data ?? []) as CollaborationActivity[],
    conversationId: (conversationResult.data as { id?: string } | null)?.id ?? null,
  };
}

export async function createProject(input: {
  title: string;
  type: CollaborationProjectType;
  description?: string;
  visibility?: CollaborationProjectVisibility;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_collaboration_project", {
    project_title: input.title.trim(),
    project_kind: input.type,
    project_description: input.description?.trim() || null,
    project_visibility: input.visibility ?? "private",
  });
  throwIfError(error);
  return data as string;
}

export async function updateProject(projectId: string, values: Partial<Pick<
  CollaborationProject,
  "title" | "description" | "visibility" | "artwork_asset_id"
>>) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("collaboration_projects")
    .update(values)
    .eq("id", projectId)
    .select("*")
    .single();
  throwIfError(error);
  return data as CollaborationProject;
}

export async function inviteProjectMember(input: {
  projectId: string;
  role: Exclude<CollaborationRole, "owner">;
  profileId?: string | null;
  email?: string | null;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("invite_project_member", {
    target_project_id: input.projectId,
    target_role: input.role,
    target_profile_id: input.profileId ?? null,
    target_email: input.email?.trim() || null,
    expires_in_days: 14,
  });
  throwIfError(error);
  const row = (data as Array<{ invite_id: string; invite_token: string }> | null)?.[0];
  if (!row) {
    throw new Error("The invitation token was not returned.");
  }
  return row;
}

export interface PendingProjectInvite {
  invite_id: string;
  project_id: string;
  project_title: string;
  project_type: CollaborationProjectType;
  role: CollaborationRole;
  invited_by: string;
  inviter_name: string;
  expires_at: string;
  created_at: string;
}

export async function listPendingInvites(_profileId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("list_pending_project_invites");
  throwIfError(error);
  return (data ?? []) as PendingProjectInvite[];
}

export async function resolveProjectInvite(token: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("resolve_project_invite", {
    invite_token: token,
  });
  throwIfError(error);
  return (data as Array<{
    invite_id: string;
    project_id: string;
    project_title: string;
    project_type: CollaborationProjectType;
    role: CollaborationRole;
    status: string;
    expires_at: string;
  }> | null)?.[0] ?? null;
}

export async function acceptProjectInvite(token: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_project_invite", {
    invite_token: token,
  });
  throwIfError(error);
  return data as string;
}

export async function declineProjectInvite(token: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("decline_project_invite", {
    invite_token: token,
  });
  throwIfError(error);
}

export async function acceptProjectInviteById(inviteId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("accept_project_invite_by_id", {
    target_invite_id: inviteId,
  });
  throwIfError(error);
  return data as string;
}

export async function declineProjectInviteById(inviteId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("decline_project_invite_by_id", {
    target_invite_id: inviteId,
  });
  throwIfError(error);
}

export async function addProjectTrack(input: {
  projectId: string;
  songId: string;
  versionId?: string | null;
  title?: string | null;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("add_project_track", {
    target_project_id: input.projectId,
    target_song_id: input.songId,
    target_version_id: input.versionId ?? null,
    target_title: input.title ?? null,
  });
  throwIfError(error);
  return data as string;
}

export async function reorderProjectTracks(projectId: string, trackIds: string[]) {
  const client = requireSupabase();
  const { error } = await client.rpc("reorder_project_tracks", {
    target_project_id: projectId,
    ordered_track_ids: trackIds,
  });
  throwIfError(error);
}

export async function removeProjectTrack(projectId: string, trackId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("collaboration_project_tracks")
    .delete()
    .eq("project_id", projectId)
    .eq("id", trackId);
  throwIfError(error);
}

export async function updateProjectTrack(input: {
  projectId: string;
  trackId: string;
  notes?: string | null;
  status?: CollaborationProjectTrack["status"];
  assignedTo?: string | null;
}) {
  const client = requireSupabase();
  const { error } = await client
    .from("collaboration_project_tracks")
    .update({
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assignedTo !== undefined ? { assigned_to: input.assignedTo } : {}),
    })
    .eq("project_id", input.projectId)
    .eq("id", input.trackId);
  throwIfError(error);
}

export async function selectProjectTrackVersion(input: {
  projectId: string;
  trackId: string;
  versionId: string;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("select_project_track_version", {
    target_project_id: input.projectId,
    target_track_id: input.trackId,
    target_version_id: input.versionId,
  });
  throwIfError(error);
}

export async function updateProjectStatus(projectId: string, status: CollaborationProjectStatus) {
  const client = requireSupabase();
  const { error } = await client.rpc("update_project_status", {
    target_project_id: projectId,
    next_status: status,
  });
  throwIfError(error);
}

export async function changeProjectMemberRole(input: {
  projectId: string;
  profileId: string;
  role: Exclude<CollaborationRole, "owner">;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("change_project_member_role", {
    target_project_id: input.projectId,
    target_profile_id: input.profileId,
    next_role: input.role,
  });
  throwIfError(error);
}

export async function removeProjectMember(projectId: string, profileId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("remove_project_member", {
    target_project_id: projectId,
    target_profile_id: profileId,
  });
  throwIfError(error);
}

export async function leaveProject(projectId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("leave_collaboration_project", {
    target_project_id: projectId,
  });
  throwIfError(error);
}

export async function transferProjectOwnership(projectId: string, profileId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("transfer_project_ownership", {
    target_project_id: projectId,
    next_owner_id: profileId,
  });
  throwIfError(error);
}

export async function deleteProject(projectId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("collaboration_projects")
    .delete()
    .eq("id", projectId);
  throwIfError(error);
}

export async function toggleFeedbackReaction(input: {
  threadId: string;
  profileId: string;
  reaction: FeedbackReaction["reaction"];
  active: boolean;
}) {
  const client = requireSupabase();
  const query = client
    .from("feedback_reactions");

  if (input.active) {
    const { error } = await query.upsert({
      thread_id: input.threadId,
      profile_id: input.profileId,
      reaction: input.reaction,
    });
    throwIfError(error);
    return;
  }

  const { error } = await query
    .delete()
    .eq("thread_id", input.threadId)
    .eq("profile_id", input.profileId)
    .eq("reaction", input.reaction);
  throwIfError(error);
}

export async function createFeedback(input: {
  projectId: string;
  trackId: string;
  versionId: string;
  startSeconds: number;
  endSeconds?: number | null;
  title?: string;
  body: string;
  category: FeedbackThread["category"];
  priority: FeedbackThread["priority"];
  assignedTo?: string | null;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_feedback_thread", {
    target_project_id: input.projectId,
    target_track_id: input.trackId,
    target_song_version_id: input.versionId,
    feedback_start_seconds: input.startSeconds,
    feedback_end_seconds: input.endSeconds ?? null,
    feedback_title: input.title?.trim() || null,
    feedback_body: input.body.trim(),
    feedback_category: input.category,
    feedback_priority: input.priority,
    feedback_assigned_to: input.assignedTo ?? null,
  });
  throwIfError(error);
  return data as string;
}

export async function replyToFeedback(threadId: string, body: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("reply_to_feedback_thread", {
    target_thread_id: threadId,
    reply_body: body.trim(),
  });
  throwIfError(error);
  return data as string;
}

export async function setFeedbackResolved(threadId: string, resolved: boolean) {
  const client = requireSupabase();
  const { error } = await client.rpc(
    resolved ? "resolve_feedback_thread" : "reopen_feedback_thread",
    { target_thread_id: threadId },
  );
  throwIfError(error);
}

export async function updateFeedbackStatus(
  threadId: string,
  status: FeedbackThread["status"],
) {
  const client = requireSupabase();
  const { error } = await client.rpc("update_feedback_thread_status", {
    target_thread_id: threadId,
    next_status: status,
  });
  throwIfError(error);
}

export async function updateVersionReviewStatus(input: {
  projectId: string;
  versionId: string;
  status: SongVersion["review_status"];
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("update_song_version_review_status", {
    target_project_id: input.projectId,
    target_version_id: input.versionId,
    next_status: input.status,
  });
  throwIfError(error);
}

export async function getProtectedAssetPlaybackUrl(assetId: string) {
  return createProtectedMediaReadUrl(assetId);
}

export interface SharedProjectTrack {
  track: CollaborationProjectTrack;
  song: Song;
  version: SongVersion | null;
  protectedAsset: ProtectedMediaAsset | null;
}

export interface SharedProjectDetail {
  targetType: "collaboration_project" | "song_version";
  targetId: string;
  permission: "view" | "review";
  project: CollaborationProject;
  owner: Profile;
  tracks: SharedProjectTrack[];
  feedbackThreads: FeedbackThread[];
}

export async function getSharedProjectByToken(token: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("resolve_shared_project", {
    supplied_token: token,
  });
  throwIfError(error);
  const payload = data as SharedProjectDetail | null;
  if (!payload?.project) throw new Error("This shared project is unavailable.");
  return payload;
}

export async function createSharedProjectFeedback(input: {
  token: string;
  trackId: string;
  versionId: string;
  startSeconds: number;
  endSeconds?: number | null;
  title?: string;
  body: string;
  category: FeedbackThread["category"];
  priority: FeedbackThread["priority"];
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_shared_feedback_thread", {
    supplied_token: input.token,
    target_track_id: input.trackId,
    target_song_version_id: input.versionId,
    feedback_start_seconds: input.startSeconds,
    feedback_end_seconds: input.endSeconds ?? null,
    feedback_title: input.title?.trim() || null,
    feedback_body: input.body.trim(),
    feedback_category: input.category,
    feedback_priority: input.priority,
  });
  throwIfError(error);
  return data as string;
}

export async function listProjectShareLinks(projectId: string, versionIds: string[] = []) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("share_links")
    .select("*")
    .in("target_type", ["collaboration_project", "song_version"])
    .order("created_at", { ascending: false });
  throwIfError(error);
  const allowedTargets = new Set([projectId, ...versionIds]);
  return ((data ?? []) as ShareLink[]).filter((link) => allowedTargets.has(link.target_id));
}

export async function createProjectShareLink(input: {
  targetType: "collaboration_project" | "song_version";
  targetId: string;
  permission: "view" | "review";
  expiresAt?: string | null;
  maxUses?: number | null;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_share_link", {
    target_kind: input.targetType,
    target_entity_id: input.targetId,
    target_permission: input.permission,
    target_expires_at: input.expiresAt ?? null,
    target_max_uses: input.maxUses ?? null,
  });
  throwIfError(error);
  const row = (data as Array<{ share_link_id: string; share_token: string }> | null)?.[0];
  if (!row) throw new Error("The share token was not returned.");
  return row;
}

export async function revokeProjectShareLink(shareLinkId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("revoke_share_link", {
    target_share_link_id: shareLinkId,
  });
  throwIfError(error);
}

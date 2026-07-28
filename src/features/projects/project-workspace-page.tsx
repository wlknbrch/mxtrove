import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  GitCompareArrows,
  Heart,
  Clock3,
  ExternalLink,
  ListMusic,
  Link2,
  MessageCircleMore,
  MessageSquareText,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Waveform } from "@/components/audio/waveform";
import { usePlayerStore } from "@/components/audio/player-store";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAssetsByIds } from "@/features/drive/api";
import { getLibraryDashboard } from "@/features/library/api";
import { createSong } from "@/features/library/api";
import {
  addProjectTrack,
  changeProjectMemberRole,
  createFeedback,
  createProjectShareLink,
  deleteProject,
  getProject,
  getProtectedAssetPlaybackUrl,
  inviteProjectMember,
  leaveProject,
  listProjectShareLinks,
  removeProjectMember,
  removeProjectTrack,
  reorderProjectTracks,
  revokeProjectShareLink,
  replyToFeedback,
  searchProjectInviteCandidates,
  selectProjectTrackVersion,
  toggleFeedbackReaction,
  transferProjectOwnership,
  updateProject,
  updateFeedbackStatus,
  updateProjectStatus,
  updateProjectTrack,
  updateVersionReviewStatus,
} from "@/features/projects/api";
import { toggleVersionHeart } from "@/features/posts/api";
import { useProjectRealtime } from "@/features/projects/use-project-realtime";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getAvatarAssetUrls, getPreviewPlaybackUrls } from "@/lib/asset-urls";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import { getAssetWaveform, normalizeWaveformData } from "@/lib/waveform";
import type {
  CollaborationProjectVisibility,
  CollaborationProjectStatus,
  CollaborationRole,
  FeedbackCategory,
  Profile,
} from "@/types/domain";

type MobilePanel = "tracks" | "review" | "people";

const editableRoles: CollaborationRole[] = ["owner", "admin", "editor"];
const memberAdminRoles: CollaborationRole[] = ["owner", "admin"];
const projectStatuses: CollaborationProjectStatus[] = [
  "planning",
  "active",
  "review",
  "finalizing",
  "completed",
  "archived",
];
const assignableRoles: Array<Exclude<CollaborationRole, "owner">> = [
  "admin",
  "editor",
  "contributor",
  "reviewer",
  "viewer",
];
const feedbackCategories: FeedbackCategory[] = [
  "general",
  "arrangement",
  "mix",
  "vocals",
  "lyrics",
  "sound_design",
  "mastering",
  "performance",
  "technical",
];

const initialFeedbackDraft = {
  body: "",
  title: "",
  time: "0",
  endTime: "",
  category: "general" as FeedbackCategory,
  priority: "normal" as const,
};

export function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const viewer = useAppViewer();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("tracks");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareVersionAId, setCompareVersionAId] = useState<string | null>(null);
  const [compareVersionBId, setCompareVersionBId] = useState<string | null>(null);
  const [librarySongId, setLibrarySongId] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [trackNotes, setTrackNotes] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectVisibility, setProjectVisibility] = useState<CollaborationProjectVisibility>("private");
  const [transferOwnerId, setTransferOwnerId] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [selectedInviteProfile, setSelectedInviteProfile] = useState<Profile | null>(null);
  const [inviteRole, setInviteRole] = useState<Exclude<CollaborationRole, "owner">>("contributor");
  const deferredInviteSearch = useDeferredValue(inviteSearch.trim());
  const [feedbackDraft, setFeedbackDraft, clearFeedbackDraft] = useLocalDraft(
    `mxshare:draft:feedback:${viewer.userId ?? "guest"}:${projectId ?? "project"}:${selectedVersionId ?? "version"}`,
    initialFeedbackDraft,
  );
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});
  const [activityMemberFilter, setActivityMemberFilter] = useState("all");
  const [activityTrackFilter, setActivityTrackFilter] = useState("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activityVisibleCount, setActivityVisibleCount] = useState(12);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState("all");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
  const {
    activeTrackId,
    currentTimeSeconds,
    enqueue,
    requestSeek,
  } = usePlayerStore();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
  const projectSnapshot = useOfflineSnapshot(
    `mxshare:offline:v2:project:${viewer.userId ?? "guest"}:${projectId ?? "unknown"}`,
    projectQuery.data ?? undefined,
  );
  const project = projectQuery.data ?? (!isOnline ? projectSnapshot : null) ?? undefined;
  const canEdit = Boolean(isOnline && project && editableRoles.includes(project.viewerRole));
  const canManageMembers = Boolean(isOnline && project && memberAdminRoles.includes(project.viewerRole));
  const libraryQuery = useQuery({
    queryKey: ["library-dashboard", viewer.userId],
    queryFn: () => getLibraryDashboard(viewer.userId!),
    enabled: Boolean(viewer.userId && canEdit),
  });
  const shareLinksQuery = useQuery({
    queryKey: ["project-share-links", projectId],
    queryFn: () => listProjectShareLinks(
      projectId!,
      (projectQuery.data?.versions ?? []).map((version) => version.id),
    ),
    enabled: Boolean(projectId && canManageMembers),
  });
  const excludedInviteProfileIds = [
    ...new Set([
      ...(project?.members.map(({ member }) => member.profile_id) ?? []),
      ...(viewer.userId ? [viewer.userId] : []),
    ]),
  ];
  const inviteCandidatesQuery = useQuery({
    queryKey: ["project-invite-candidates", projectId, deferredInviteSearch, excludedInviteProfileIds],
    queryFn: () => searchProjectInviteCandidates(deferredInviteSearch, excludedInviteProfileIds),
    enabled: Boolean(
      canManageMembers
      && deferredInviteSearch.length >= 2
      && !selectedInviteProfile,
    ),
    staleTime: 30_000,
  });
  const inviteCandidates = inviteCandidatesQuery.data ?? [];
  const avatarAssetIds = [
    ...new Set([
      ...(project?.members
        .map(({ profile }) => profile?.avatar_asset_id)
        .filter((assetId): assetId is string => Boolean(assetId)) ?? []),
      ...inviteCandidates
        .map((profile) => profile.avatar_asset_id)
        .filter((assetId): assetId is string => Boolean(assetId)),
    ]),
  ];
  const avatarAssetsQuery = useQuery({
    queryKey: ["project-member-avatars", avatarAssetIds],
    queryFn: () => getAssetsByIds(avatarAssetIds),
    enabled: avatarAssetIds.length > 0,
  });
  const avatarAssetsById = new Map(
    (avatarAssetsQuery.data ?? []).map((asset) => [asset.id, asset]),
  );

  useProjectRealtime(projectId, queryClient);

  useEffect(() => {
    if (!project?.tracks.length) {
      setSelectedTrackId(null);
      setSelectedVersionId(null);
      return;
    }
    const nextTrack = project.tracks.find((track) => track.id === selectedTrackId) ?? project.tracks[0];
    if (nextTrack.id !== selectedTrackId) {
      setSelectedTrackId(nextTrack.id);
    }
    const versions = project.versions.filter((version) => version.song_id === nextTrack.song_id);
    if (!versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(nextTrack.active_version_id ?? versions[0]?.id ?? null);
    }
  }, [project, selectedTrackId, selectedVersionId]);

  useEffect(() => {
    const track = project?.tracks.find((entry) => entry.id === selectedTrackId);
    if (!track) {
      setCompareVersionAId(null);
      setCompareVersionBId(null);
      return;
    }
    const versions = project!.versions.filter((version) => version.song_id === track.song_id);
    const defaultA = track.active_version_id ?? versions[0]?.id ?? null;
    setCompareVersionAId((current) => versions.some((version) => version.id === current) ? current : defaultA);
    setCompareVersionBId((current) => (
      versions.some((version) => version.id === current && version.id !== defaultA)
        ? current
        : versions.find((version) => version.id !== defaultA)?.id ?? null
    ));
  }, [project, selectedTrackId]);

  useEffect(() => {
    const track = project?.tracks.find((entry) => entry.id === selectedTrackId);
    setTrackNotes(track?.notes ?? "");
  }, [project, selectedTrackId]);

  useEffect(() => {
    setProjectTitle(project?.project.title ?? "");
    setProjectDescription(project?.project.description ?? "");
    setProjectVisibility(project?.project.visibility ?? "private");
  }, [project?.project.description, project?.project.title, project?.project.visibility]);

  useEffect(() => {
    if (activeTrackId === selectedVersionId) {
      setFeedbackDraft((current) => ({
        ...current,
        time: currentTimeSeconds.toFixed(1),
      }));
    }
  }, [activeTrackId, currentTimeSeconds, selectedVersionId, setFeedbackDraft]);

  useEffect(() => {
    setActivityVisibleCount(12);
  }, [activityMemberFilter, activityTrackFilter, activityTypeFilter]);

  const invalidateProject = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
    ]);
  };

  const addTrackMutation = useMutation({
    mutationFn: () => addProjectTrack({ projectId: projectId!, songId: librarySongId }),
    onSuccess: async (trackId) => {
      setLibrarySongId("");
      setSelectedTrackId(trackId);
      await invalidateProject();
      toast.success("Track added to the room.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add the track."),
  });
  const createProjectSongMutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) throw new Error("Please sign in first.");
      const song = await createSong(viewer.userId, {
        title: newSongTitle,
        notes: "",
        default_artwork_asset_id: null,
      });
      const trackId = await addProjectTrack({
        projectId: projectId!,
        songId: song.id,
      });
      return { songId: song.id, trackId };
    },
    onSuccess: async ({ songId, trackId }) => {
      setNewSongTitle("");
      await invalidateProject();
      toast.success("Song created in this project. Add its source and first version next.");
      navigate(`/library/songs/${songId}?project=${projectId}&track=${trackId}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create the song."),
  });
  const reorderTracksMutation = useMutation({
    mutationFn: (trackIds: string[]) => reorderProjectTracks(projectId!, trackIds),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not reorder the tracks."),
  });
  const removeTrackMutation = useMutation({
    mutationFn: (trackId: string) => removeProjectTrack(projectId!, trackId),
    onSuccess: async () => {
      await invalidateProject();
      toast.success("Track removed from the project. The Library song remains intact.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove the track."),
  });
  const selectVersionMutation = useMutation({
    mutationFn: (versionId: string) => selectProjectTrackVersion({
      projectId: projectId!,
      trackId: selectedTrackId!,
      versionId,
    }),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not select the version."),
  });
  const statusMutation = useMutation({
    mutationFn: (status: CollaborationProjectStatus) => updateProjectStatus(projectId!, status),
    onSuccess: async () => {
      await invalidateProject();
      toast.success("Project status updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the project."),
  });
  const trackStatusMutation = useMutation({
    mutationFn: (status: NonNullable<typeof selectedTrack>["status"]) => updateProjectTrack({
      projectId: projectId!,
      trackId: selectedTrackId!,
      status,
    }),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the track."),
  });
  const trackDetailsMutation = useMutation({
    mutationFn: (input: { notes?: string | null; assignedTo?: string | null }) => updateProjectTrack({
      projectId: projectId!,
      trackId: selectedTrackId!,
      ...input,
    }),
    onSuccess: async () => {
      await invalidateProject();
      toast.success("Track details updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the track."),
  });
  const feedbackMutation = useMutation({
    mutationFn: () => createFeedback({
      projectId: projectId!,
      trackId: selectedTrackId!,
      versionId: selectedVersionId!,
      startSeconds: Number(feedbackDraft.time) || 0,
      endSeconds: feedbackDraft.endTime ? Number(feedbackDraft.endTime) : null,
      title: feedbackDraft.title,
      body: feedbackDraft.body,
      category: feedbackDraft.category,
      priority: feedbackDraft.priority,
    }),
    onSuccess: async () => {
      clearFeedbackDraft();
      await invalidateProject();
      toast.success("Time marker added.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add feedback."),
  });
  const feedbackStatusMutation = useMutation({
    mutationFn: ({ threadId, status }: {
      threadId: string;
      status: "open" | "in_progress" | "resolved" | "wont_fix";
    }) => updateFeedbackStatus(threadId, status),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update feedback."),
  });
  const feedbackReactionMutation = useMutation({
    mutationFn: ({ threadId, reaction, active }: {
      threadId: string;
      reaction: "agree" | "disagree" | "done" | "important";
      active: boolean;
    }) => {
      if (!viewer.userId) throw new Error("Please sign in first.");
      return toggleFeedbackReaction({ threadId, reaction, active, profileId: viewer.userId });
    },
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the reaction."),
  });
  const versionHeartMutation = useMutation({
    mutationFn: ({ versionId, active }: { versionId: string; active: boolean }) => {
      if (!viewer.userId) throw new Error("Please sign in first.");
      return toggleVersionHeart({ versionId, profileId: viewer.userId, active });
    },
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the version heart."),
  });
  const reviewStatusMutation = useMutation({
    mutationFn: ({ versionId, status }: {
      versionId: string;
      status: "not_requested" | "review_requested" | "changes_requested" | "approved";
    }) => updateVersionReviewStatus({ projectId: projectId!, versionId, status }),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the review status."),
  });
  const replyMutation = useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) => replyToFeedback(threadId, body),
    onSuccess: async (_data, variables) => {
      setReplyBodies((current) => ({ ...current, [variables.threadId]: "" }));
      await invalidateProject();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send the reply."),
  });
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInviteProfile) {
        throw new Error("Choose a profile from the search results.");
      }
      return inviteProjectMember({
        projectId: projectId!,
        profileId: selectedInviteProfile.id,
        role: inviteRole,
      });
    },
    onSuccess: async ({ invite_token: token }) => {
      setInviteSearch("");
      setSelectedInviteProfile(null);
      await navigator.clipboard?.writeText(`${window.location.origin}/invites/${token}`);
      await invalidateProject();
      toast.success("Invitation created and its private link copied.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create the invitation."),
  });
  const roleMutation = useMutation({
    mutationFn: ({ profileId, role }: { profileId: string; role: Exclude<CollaborationRole, "owner"> }) =>
      changeProjectMemberRole({ projectId: projectId!, profileId, role }),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not change the role."),
  });
  const removeMemberMutation = useMutation({
    mutationFn: (profileId: string) => removeProjectMember(projectId!, profileId),
    onSuccess: invalidateProject,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove the member."),
  });
  const projectDetailsMutation = useMutation({
    mutationFn: () => updateProject(projectId!, {
      title: projectTitle.trim(),
      description: projectDescription.trim() || null,
      visibility: projectVisibility,
    }),
    onSuccess: async () => {
      await invalidateProject();
      toast.success("Project details saved.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the project."),
  });
  const transferOwnerMutation = useMutation({
    mutationFn: () => transferProjectOwnership(projectId!, transferOwnerId),
    onSuccess: async () => {
      setTransferOwnerId("");
      await invalidateProject();
      toast.success("Project ownership transferred.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not transfer ownership."),
  });
  const leaveProjectMutation = useMutation({
    mutationFn: () => leaveProject(projectId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projects");
      toast.success("You left the project.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not leave the project."),
  });
  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projects");
      toast.success("Project deleted.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete the project."),
  });
  const createProjectLinkMutation = useMutation({
    mutationFn: (input: {
      targetType: "collaboration_project" | "song_version";
      targetId: string;
    }) => createProjectShareLink({
      ...input,
      permission: "review",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      maxUses: null,
    }),
    onSuccess: async ({ share_token: token }) => {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
      await shareLinksQuery.refetch();
      toast.success("Protected review link copied. Its token is shown only once.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create the review link."),
  });
  const revokeProjectLinkMutation = useMutation({
    mutationFn: revokeProjectShareLink,
    onSuccess: async () => {
      await shareLinksQuery.refetch();
      toast.success("Review link revoked.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not revoke the review link."),
  });

  if (projectQuery.isPending) {
    return <Card><p className="text-sm text-muted-foreground">Opening the collaboration room…</p></Card>;
  }
  if (!project || !projectId) {
    return (
      <EmptyState
        icon={ListMusic}
        title="Project unavailable"
        description="The room does not exist, or your account no longer has access."
        actionLabel="Back to projects"
        onAction={() => navigate("/projects")}
      />
    );
  }

  const selectedTrack = project.tracks.find((track) => track.id === selectedTrackId) ?? null;
  const selectedSong = project.songs.find((song) => song.id === selectedTrack?.song_id) ?? null;
  const trackVersions = project.versions.filter((version) => version.song_id === selectedTrack?.song_id);
  const selectedVersion = trackVersions.find((version) => version.id === selectedVersionId) ?? trackVersions[0] ?? null;
  const selectedProtectedAsset = project.protectedAssets.find(
    (asset) => asset.song_version_id === selectedVersion?.id,
  ) ?? null;
  const selectedPublicAsset = project.assets.find(
    (asset) => asset.id === selectedVersion?.preview_asset_id,
  ) ?? null;
  const selectedWaveform = normalizeWaveformData(selectedProtectedAsset?.waveform_data)
    ?? getAssetWaveform(selectedPublicAsset);
  const selectedDuration = selectedProtectedAsset?.duration_seconds
    ?? selectedPublicAsset?.duration_seconds
    ?? selectedWaveform?.durationSeconds
    ?? null;
  const selectedFeedback = project.feedbackThreads
    .filter((thread) => thread.song_version_id === selectedVersion?.id)
    .sort((left, right) => left.start_seconds - right.start_seconds);
  const visibleFeedback = selectedFeedback.filter((thread) => {
    if (feedbackCategoryFilter !== "all" && thread.category !== feedbackCategoryFilter) return false;
    if (feedbackStatusFilter !== "all" && thread.status !== feedbackStatusFilter) return false;
    return true;
  });
  const availableLibrarySongs = (libraryQuery.data?.songs ?? []).filter(
    (song) => !project.tracks.some((track) => track.song_id === song.id),
  );
  const activityTypes = Array.from(new Set(project.activity.map((entry) => entry.activity_type))).sort();
  const getVersionHeartCount = (versionId: string) =>
    project.versionHearts.filter((heart) => heart.song_version_id === versionId).length;
  const hasViewerVersionHeart = (versionId: string) =>
    project.versionHearts.some(
      (heart) => heart.song_version_id === versionId && heart.profile_id === viewer.userId,
    );
  const filteredActivity = project.activity.filter((entry) => {
    const metadataTrackId = typeof entry.metadata.track_id === "string" ? entry.metadata.track_id : null;
    const entryTrackId = entry.entity_type === "track" ? entry.entity_id : metadataTrackId;
    if (activityMemberFilter !== "all" && entry.actor_id !== activityMemberFilter) return false;
    if (activityTrackFilter !== "all" && entryTrackId !== activityTrackFilter) return false;
    if (activityTypeFilter !== "all" && entry.activity_type !== activityTypeFilter) return false;
    return true;
  });

  function chooseTrack(trackId: string) {
    const track = project!.tracks.find((entry) => entry.id === trackId);
    if (!track) return;
    const versions = project!.versions.filter((version) => version.song_id === track.song_id);
    setSelectedTrackId(track.id);
    setSelectedVersionId(track.active_version_id ?? versions[0]?.id ?? null);
    setMobilePanel("review");
  }

  function moveTrack(trackIndex: number, offset: -1 | 1) {
    const destination = trackIndex + offset;
    if (destination < 0 || destination >= project!.tracks.length) return;
    const orderedIds = project!.tracks.map((track) => track.id);
    [orderedIds[trackIndex], orderedIds[destination]] = [orderedIds[destination], orderedIds[trackIndex]];
    reorderTracksMutation.mutate(orderedIds);
  }

  async function playVersion(versionId: string, seekSeconds?: number) {
    if (!isOnline) {
      toast.error("Protected project audio is unavailable offline.");
      return;
    }
    if (!selectedTrack) return;
    const version = trackVersions.find((entry) => entry.id === versionId);
    if (!version) return;
    const protectedAsset = project!.protectedAssets.find((asset) => asset.song_version_id === version.id) ?? null;
    const publicAsset = project!.assets.find((asset) => asset.id === version.preview_asset_id) ?? null;
    const waveform = normalizeWaveformData(protectedAsset?.waveform_data) ?? getAssetWaveform(publicAsset);
    const duration = protectedAsset?.duration_seconds ?? publicAsset?.duration_seconds ?? waveform?.durationSeconds ?? null;
    let srcCandidates = getPreviewPlaybackUrls(publicAsset);
    if (protectedAsset) {
      const protectedUrl = await getProtectedAssetPlaybackUrl(protectedAsset.id);
      srcCandidates = [protectedUrl, ...srcCandidates];
    }
    if (!srcCandidates.length) {
      toast.error("This version has no playable derivative yet.");
      return;
    }
    enqueue([
      {
        id: version.id,
        versionId: version.id,
        title: selectedTrack.track_title,
        artistName: project!.project.title,
        src: srcCandidates[0],
        srcCandidates,
        durationSeconds: duration,
        waveform,
        versionLabel: version.version_label,
        queueGroupLabel: "Collaboration project",
      },
    ], version.id, true);
    setSelectedVersionId(version.id);
    if (typeof seekSeconds === "number") {
      requestSeek(seekSeconds);
    }
  }

  async function playSelectedVersion(seekSeconds?: number) {
    if (!selectedVersion) return;
    await playVersion(selectedVersion.id, seekSeconds);
  }

  function compareAtCurrentPosition(versionId: string | null) {
    if (!versionId) return;
    const preserveSeconds = trackVersions.some((version) => version.id === activeTrackId)
      ? currentTimeSeconds
      : 0;
    void playVersion(versionId, preserveSeconds);
  }

  const trackPanel = (
    <Card className="h-full p-0 md:p-0">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Sequence</p>
            <h2 className="mt-1 font-display text-2xl">Tracks</h2>
          </div>
          <Badge variant="accent">{project.tracks.length}</Badge>
        </div>
        {canEdit ? (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Select value={librarySongId} onChange={(event) => setLibrarySongId(event.currentTarget.value)}>
                <option value="">Add from Library…</option>
                {availableLibrarySongs.map((song) => (
                  <option key={song.id} value={song.id}>{song.title}</option>
                ))}
              </Select>
              <Button
                size="sm"
                aria-label="Add selected song"
                disabled={!librarySongId || addTrackMutation.isPending}
                onClick={() => addTrackMutation.mutate()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={newSongTitle}
                placeholder="Create a new song here"
                onChange={(event) => setNewSongTitle(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newSongTitle.trim()) {
                    event.preventDefault();
                    createProjectSongMutation.mutate();
                  }
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                aria-label="Create song in project"
                disabled={!newSongTitle.trim() || createProjectSongMutation.isPending}
                onClick={() => createProjectSongMutation.mutate()}
              >
                New
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-3">
        {project.tracks.map((track, trackIndex) => {
          const versions = project.versions.filter((version) => version.song_id === track.song_id);
          const isSelected = track.id === selectedTrackId;
          return (
            <div
              key={track.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-[20px] border p-3 text-left transition-colors",
                isSelected
                  ? "border-accent/40 bg-accent/12"
                  : "border-transparent hover:border-border hover:bg-white/[0.035]",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => chooseTrack(track.id)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.05] text-sm text-muted-foreground">
                  {track.track_number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{track.track_title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {versions.length} version{versions.length === 1 ? "" : "s"} · {track.status}
                  </span>
                </span>
              </button>
              {canEdit ? (
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-white/6 hover:text-foreground disabled:opacity-30"
                    aria-label={`Move ${track.track_title} up`}
                    disabled={trackIndex === 0 || reorderTracksMutation.isPending}
                    onClick={() => moveTrack(trackIndex, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-white/6 hover:text-foreground disabled:opacity-30"
                    aria-label={`Move ${track.track_title} down`}
                    disabled={trackIndex === project.tracks.length - 1 || reorderTracksMutation.isPending}
                    onClick={() => moveTrack(trackIndex, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </span>
              ) : (
                <MoreHorizontal className="size-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
        {!project.tracks.length ? (
          <p className="px-3 py-8 text-center text-sm leading-6 text-muted-foreground">
            Add a Library song to begin the project sequence.
          </p>
        ) : null}
      </div>
    </Card>
  );

  const reviewPanel = selectedTrack && selectedVersion ? (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Track {selectedTrack.track_number}</Badge>
              <Badge variant={selectedTrack.status === "approved" || selectedTrack.status === "final" ? "success" : "neutral"}>
                {selectedTrack.status}
              </Badge>
            </div>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.04em]">{selectedTrack.track_title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedSong?.notes ?? "Versions and time-coded notes stay together in this room."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/library/songs/${selectedTrack.song_id}?project=${project.project.id}&track=${selectedTrack.id}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="size-4" />
                Version workspace
              </Button>
            </Link>
            {canEdit ? (
              <Select
                value={selectedTrack.status}
                className="min-h-9 py-2"
                onChange={(event) => trackStatusMutation.mutate(event.currentTarget.value as typeof selectedTrack.status)}
              >
                {["idea", "draft", "recording", "arrangement", "mixing", "review", "approved", "final"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border border-accent/18 bg-[radial-gradient(circle_at_15%_50%,rgba(var(--accent-rgb),0.18),transparent_36%),rgba(255,255,255,0.025)] p-4">
          <div className="flex items-center gap-3">
            <Button
              className="size-12 rounded-full p-0"
              aria-label={`Play ${selectedTrack.track_title}`}
              onClick={() => void playSelectedVersion()}
            >
              <Play className="size-5 fill-current" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">V{selectedVersion.version_number} · {selectedVersion.version_label}</span>
                <span>{formatDuration(selectedDuration)}</span>
              </div>
              <Waveform
                waveform={selectedWaveform}
                durationSeconds={selectedDuration}
                currentTime={activeTrackId === selectedVersion.id ? currentTimeSeconds : 0}
                onSeek={(seconds) => void playSelectedVersion(seconds)}
                markers={visibleFeedback.map((thread) => ({
                  id: thread.id,
                  timeSeconds: thread.start_seconds,
                  label: thread.title ?? thread.category.replace("_", " "),
                  status: thread.status,
                }))}
                onMarkerSelect={(_markerId, seconds) => void playSelectedVersion(Math.max(0, seconds - 2))}
                variant="preview"
                className="h-20"
                trackClassName="rounded-[16px]"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {trackVersions.map((version) => (
            <button
              key={version.id}
              type="button"
              className={cn(
                "rounded-full border px-3 py-2 text-xs transition-colors",
                version.id === selectedVersion.id
                  ? "border-accent/45 bg-accent/15 text-accent-secondary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setSelectedVersionId(version.id)}
              onDoubleClick={() => selectVersionMutation.mutate(version.id)}
            >
              V{version.version_number} · {version.version_label}
              {selectedTrack.active_version_id === version.id ? " · selected" : ""}
            </button>
          ))}
          {canEdit && selectedVersion.id !== selectedTrack.active_version_id ? (
            <Button size="sm" variant="secondary" onClick={() => selectVersionMutation.mutate(selectedVersion.id)}>
              <CheckCircle2 className="size-4" />
              Use for project
            </Button>
          ) : null}
        </div>

        {trackVersions.length > 1 ? (
          <div className="mt-5 rounded-[24px] border border-border bg-white/[0.022] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent-secondary">
                  <GitCompareArrows className="size-4" />
                  Version compare
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Switch A/B without losing the current playback position.
                </p>
              </div>
              <Badge variant="neutral">{formatDuration(currentTimeSeconds)}</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                {
                  label: "A",
                  value: compareVersionAId,
                  setValue: setCompareVersionAId,
                },
                {
                  label: "B",
                  value: compareVersionBId,
                  setValue: setCompareVersionBId,
                },
              ].map((slot) => {
                const version = trackVersions.find((entry) => entry.id === slot.value) ?? null;
                return (
                  <div key={slot.label} className="rounded-[20px] border border-white/[0.07] p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent">{slot.label}</Badge>
                      <Select
                        aria-label={`Compare version ${slot.label}`}
                        value={slot.value ?? ""}
                        onChange={(event) => slot.setValue(event.currentTarget.value || null)}
                      >
                        {trackVersions.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            V{entry.version_number} · {entry.version_label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {version ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={activeTrackId === version.id ? "primary" : "secondary"}
                          onClick={() => compareAtCurrentPosition(version.id)}
                        >
                          <Play className="size-4 fill-current" />
                          Play {slot.label}
                        </Button>
                        <Badge variant={version.review_status === "approved" ? "success" : "neutral"}>
                          {version.review_status.replaceAll("_", " ")}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Heart className="size-3.5" />
                          {getVersionHeartCount(version.id)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Select
            aria-label="Selected version review status"
            className="min-h-9 w-auto py-2"
            value={selectedVersion.review_status}
            disabled={!isOnline || project.viewerRole === "viewer" || reviewStatusMutation.isPending}
            onChange={(event) => reviewStatusMutation.mutate({
              versionId: selectedVersion.id,
              status: event.currentTarget.value as typeof selectedVersion.review_status,
            })}
          >
            {["not_requested", "review_requested", "changes_requested", "approved"].map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="ghost"
            disabled={
              !viewer.userId ||
              !isOnline ||
              selectedVersion.owner_id === viewer.userId ||
              versionHeartMutation.isPending
            }
            aria-pressed={hasViewerVersionHeart(selectedVersion.id)}
            onClick={() => versionHeartMutation.mutate({
              versionId: selectedVersion.id,
              active: !hasViewerVersionHeart(selectedVersion.id),
            })}
          >
            <Heart className={cn("size-4", hasViewerVersionHeart(selectedVersion.id) && "fill-current text-accent-secondary")} />
            {getVersionHeartCount(selectedVersion.id)}
          </Button>
          {selectedVersion.owner_id === viewer.userId ? (
            <span className="text-xs text-muted-foreground">Your version cannot heart itself.</span>
          ) : null}
        </div>
      </Card>

      {canEdit ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Track context</p>
              <h2 className="mt-1 font-display text-2xl">Assignment and notes</h2>
            </div>
            <Select
              aria-label="Assign track to project member"
              className="min-h-10 min-w-48 py-2"
              value={selectedTrack.assigned_to ?? ""}
              onChange={(event) => trackDetailsMutation.mutate({
                assignedTo: event.currentTarget.value || null,
              })}
            >
              <option value="">Unassigned</option>
              {project.members.map(({ member, profile }) => (
                <option key={member.profile_id} value={member.profile_id}>
                  {profile?.display_name ?? profile?.username ?? "Project member"}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            className="mt-4"
            rows={3}
            value={trackNotes}
            placeholder="Internal arrangement, recording, or hand-off notes for this track."
            onChange={(event) => setTrackNotes(event.currentTarget.value)}
          />
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={trackDetailsMutation.isPending || trackNotes === (selectedTrack.notes ?? "")}
              onClick={() => trackDetailsMutation.mutate({ notes: trackNotes })}
            >
              Save track notes
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Review layer</p>
            <h2 className="mt-1 font-display text-2xl">Time-coded feedback</h2>
          </div>
          <Badge variant="neutral">{visibleFeedback.length} markers</Badge>
        </div>

        {isOnline && project.viewerRole !== "viewer" ? (
          <div className="mt-5 space-y-4 rounded-[24px] border border-border bg-white/[0.025] p-4">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs text-muted-foreground">Start</span>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={feedbackDraft.time}
                  aria-label="Feedback start time in seconds"
                  onChange={(event) => {
                    const time = event.currentTarget.value;
                    setFeedbackDraft((current) => ({ ...current, time }));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs text-muted-foreground">End (optional)</span>
                <Input
                  type="number"
                  min={feedbackDraft.time || "0"}
                  step="0.1"
                  value={feedbackDraft.endTime}
                  aria-label="Feedback end time in seconds"
                  onChange={(event) => {
                    const endTime = event.currentTarget.value;
                    setFeedbackDraft((current) => ({ ...current, endTime }));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs text-muted-foreground">Category</span>
                <Select
                  value={feedbackDraft.category}
                  onChange={(event) => {
                    const category = event.currentTarget.value as FeedbackCategory;
                    setFeedbackDraft((current) => ({ ...current, category }));
                  }}
                >
                  {feedbackCategories.map((category) => <option key={category}>{category}</option>)}
                </Select>
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs text-muted-foreground">Priority</span>
                <Select
                  value={feedbackDraft.priority}
                  onChange={(event) => {
                    const priority = event.currentTarget.value as typeof feedbackDraft.priority;
                    setFeedbackDraft((current) => ({ ...current, priority }));
                  }}
                >
                  {["low", "normal", "high", "blocking"].map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0 space-y-2">
                <Input
                  value={feedbackDraft.title}
                  placeholder="Marker title (optional)"
                  onChange={(event) => {
                    const title = event.currentTarget.value;
                    setFeedbackDraft((current) => ({ ...current, title }));
                  }}
                />
                <Textarea
                  value={feedbackDraft.body}
                  rows={2}
                  className="min-h-20"
                  placeholder="What should change at this moment?"
                  onChange={(event) => {
                    const body = event.currentTarget.value;
                    setFeedbackDraft((current) => ({ ...current, body }));
                  }}
                />
              </div>
              <Button
                className="w-full whitespace-nowrap xl:w-auto"
                disabled={!feedbackDraft.body.trim() || feedbackMutation.isPending}
                onClick={() => feedbackMutation.mutate()}
              >
                <Plus className="size-4" />
                Add at {formatDuration(Number(feedbackDraft.time) || 0)}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Select
            aria-label="Filter feedback by category"
            value={feedbackCategoryFilter}
            onChange={(event) => setFeedbackCategoryFilter(event.currentTarget.value)}
          >
            <option value="all">All categories</option>
            {feedbackCategories.map((category) => <option key={category}>{category}</option>)}
          </Select>
          <Select
            aria-label="Filter feedback by status"
            value={feedbackStatusFilter}
            onChange={(event) => setFeedbackStatusFilter(event.currentTarget.value)}
          >
            <option value="all">All statuses</option>
            {["open", "in_progress", "resolved", "wont_fix"].map((status) => (
              <option key={status} value={status}>{status.replace("_", " ")}</option>
            ))}
          </Select>
        </div>

        <div className="mt-5 space-y-3">
          {visibleFeedback.map((thread) => {
            const author = project.members.find(({ member }) => member.profile_id === thread.author_id)?.profile;
            const replies = project.feedbackReplies.filter((reply) => reply.thread_id === thread.id && !reply.deleted_at);
            return (
              <div
                key={thread.id}
                className={cn(
                  "rounded-[24px] border p-4",
                  thread.status === "resolved" ? "border-success/20 bg-success/[0.035]" : "border-border bg-white/[0.02]",
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                    <button
                    type="button"
                    className="rounded-full border border-accent/30 bg-accent/12 px-3 py-1.5 text-xs font-medium text-accent-secondary"
                    onClick={() => void playSelectedVersion(Math.max(0, thread.start_seconds - 2))}
                  >
                    {formatDuration(thread.start_seconds)}
                    {thread.end_seconds ? `–${formatDuration(thread.end_seconds)}` : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{thread.title ?? thread.category.replace("_", " ")}</p>
                      <Badge variant={thread.status === "resolved" ? "success" : thread.priority === "blocking" ? "warning" : "neutral"}>
                        {thread.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{thread.body}</p>
                    <p className="mt-2 text-xs text-subtle-foreground">
                      {author?.display_name ?? "Project member"} · {formatRelativeTime(thread.created_at)}
                    </p>
                  </div>
                  {isOnline && project.viewerRole !== "viewer" ? (
                    <Select
                      aria-label="Feedback status"
                      className="min-h-9 w-36 py-2"
                      value={thread.status}
                      disabled={feedbackStatusMutation.isPending}
                      onChange={(event) => feedbackStatusMutation.mutate({
                        threadId: thread.id,
                        status: event.currentTarget.value as typeof thread.status,
                      })}
                    >
                      {["open", "in_progress", "resolved", "wont_fix"].map((status) => (
                        <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                      ))}
                    </Select>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {([
                    { value: "agree", label: "Agree", icon: ThumbsUp },
                    { value: "disagree", label: "Disagree", icon: ThumbsDown },
                    { value: "done", label: "Done", icon: CheckCircle2 },
                    { value: "important", label: "Important", icon: AlertCircle },
                  ] as const).map((reactionOption) => {
                    const reactionRows = project.feedbackReactions.filter(
                      (reaction) =>
                        reaction.thread_id === thread.id &&
                        reaction.reaction === reactionOption.value,
                    );
                    const active = reactionRows.some((reaction) => reaction.profile_id === viewer.userId);
                    const ReactionIcon = reactionOption.icon;
                    return (
                      <Button
                        key={reactionOption.value}
                        size="sm"
                        variant="ghost"
                        className={cn("min-h-8 px-2 text-xs", active && "text-accent-secondary")}
                        aria-pressed={active}
                        disabled={!isOnline || !viewer.userId || project.viewerRole === "viewer" || feedbackReactionMutation.isPending}
                        onClick={() => feedbackReactionMutation.mutate({
                          threadId: thread.id,
                          reaction: reactionOption.value,
                          active: !active,
                        })}
                      >
                        <ReactionIcon className={cn("size-3.5", active && "fill-current")} />
                        {reactionOption.label}
                        {reactionRows.length ? reactionRows.length : ""}
                      </Button>
                    );
                  })}
                </div>

                {replies.length ? (
                  <div className="ml-4 mt-4 space-y-2 border-l border-border pl-4">
                    {replies.map((reply) => {
                      const replyAuthor = project.members.find(({ member }) => member.profile_id === reply.author_id)?.profile;
                      return (
                        <div key={reply.id} className="rounded-[18px] bg-white/[0.025] px-3 py-2">
                          <p className="text-sm">{reply.body}</p>
                          <p className="mt-1 text-xs text-subtle-foreground">
                            {replyAuthor?.display_name ?? "Project member"} · {formatRelativeTime(reply.created_at)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {isOnline && project.viewerRole !== "viewer" ? (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={replyBodies[thread.id] ?? ""}
                      placeholder="Reply in context…"
                      onChange={(event) => {
                        const body = event.currentTarget.value;
                        setReplyBodies((current) => ({
                          ...current,
                          [thread.id]: body,
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && (replyBodies[thread.id] ?? "").trim()) {
                          event.preventDefault();
                          replyMutation.mutate({ threadId: thread.id, body: replyBodies[thread.id] });
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      aria-label="Send feedback reply"
                      disabled={!(replyBodies[thread.id] ?? "").trim()}
                      onClick={() => replyMutation.mutate({ threadId: thread.id, body: replyBodies[thread.id] })}
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!visibleFeedback.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {selectedFeedback.length
                ? "No notes match these filters."
                : "No notes on this version yet. Start playback and leave the first marker."}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  ) : (
    <EmptyState
      icon={MessageSquareText}
      title="Choose a track"
      description="Select a track from the sequence to compare versions and review the music."
    />
  );

  const peoplePanel = (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Room access</p>
            <h2 className="mt-1 font-display text-2xl">Members</h2>
          </div>
          <Badge variant="accent">{project.members.length}</Badge>
        </div>

        {canManageMembers ? (
          <div className="mt-5 space-y-3 rounded-[22px] border border-border p-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={inviteSearch}
                  className="pl-10"
                  placeholder="Search name or @username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  aria-label="Search profiles to invite"
                  aria-expanded={Boolean(
                    !selectedInviteProfile
                    && deferredInviteSearch.length >= 2
                    && (inviteCandidatesQuery.isFetching || inviteCandidates.length),
                  )}
                  aria-controls="project-invite-candidates"
                  onChange={(event) => {
                    setInviteSearch(event.currentTarget.value);
                    setSelectedInviteProfile(null);
                  }}
                />
              </div>

              {selectedInviteProfile ? (
                <div className="flex items-center gap-3 rounded-[18px] border border-accent/35 bg-accent/8 px-3 py-2.5">
                  <Avatar
                    alt={selectedInviteProfile.display_name}
                    src={getAvatarAssetUrls(
                      selectedInviteProfile.avatar_asset_id
                        ? avatarAssetsById.get(selectedInviteProfile.avatar_asset_id)
                        : null,
                    )}
                    initials={selectedInviteProfile.display_name.slice(0, 2).toUpperCase()}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{selectedInviteProfile.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{selectedInviteProfile.username}</p>
                  </div>
                  <Badge variant="accent">Selected</Badge>
                </div>
              ) : deferredInviteSearch.length >= 2 ? (
                <div
                  id="project-invite-candidates"
                  className="max-h-72 space-y-1 overflow-y-auto rounded-[18px] border border-border bg-background/75 p-1.5"
                >
                  {inviteCandidatesQuery.isFetching ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">Searching profiles...</p>
                  ) : inviteCandidates.length ? (
                    inviteCandidates.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        onClick={() => {
                          setSelectedInviteProfile(profile);
                          setInviteSearch(`@${profile.username}`);
                        }}
                      >
                        <Avatar
                          alt={profile.display_name}
                          src={getAvatarAssetUrls(
                            profile.avatar_asset_id
                              ? avatarAssetsById.get(profile.avatar_asset_id)
                              : null,
                          )}
                          initials={profile.display_name.slice(0, 2).toUpperCase()}
                          className="size-10"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{profile.display_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No matching profiles found.
                    </p>
                  )}
                </div>
              ) : (
                <p className="px-1 text-xs text-muted-foreground">
                  Enter at least two characters. Small typos are okay.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={inviteRole} onChange={(event) => setInviteRole(event.currentTarget.value as typeof inviteRole)}>
                {assignableRoles.map((role) => <option key={role}>{role}</option>)}
              </Select>
              <Button
                size="sm"
                disabled={!selectedInviteProfile || inviteMutation.isPending}
                aria-label="Invite selected profile"
                onClick={() => inviteMutation.mutate()}
              >
                <UserPlus className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {project.members.map(({ member, profile }) => (
            <div key={member.profile_id} className="flex items-center gap-3 rounded-[20px] border border-border px-3 py-3">
              <Avatar
                alt={profile?.display_name ?? "Project member"}
                src={getAvatarAssetUrls(
                  profile?.avatar_asset_id
                    ? avatarAssetsById.get(profile.avatar_asset_id)
                    : null,
                )}
                initials={(profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
                className="size-10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{profile?.display_name ?? "MxTrove member"}</p>
                <p className="truncate text-xs text-muted-foreground">@{profile?.username ?? member.profile_id.slice(0, 8)}</p>
              </div>
              {canManageMembers && member.role !== "owner" ? (
                <Select
                  value={member.role}
                  className="min-h-9 w-32 py-2"
                  onChange={(event) => roleMutation.mutate({
                    profileId: member.profile_id,
                    role: event.currentTarget.value as Exclude<CollaborationRole, "owner">,
                  })}
                >
                  {assignableRoles.map((role) => <option key={role}>{role}</option>)}
                </Select>
              ) : (
                <Badge variant={member.role === "owner" ? "accent" : "neutral"}>{member.role}</Badge>
              )}
              {canManageMembers && member.role !== "owner" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${profile?.display_name ?? "member"}`}
                  onClick={() => removeMemberMutation.mutate(member.profile_id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Project settings</p>
            <h2 className="mt-1 font-display text-2xl">Room controls</h2>
          </div>
          <Settings2 className="size-5 text-muted-foreground" />
        </div>

        {canEdit ? (
          <div className="mt-5 space-y-3">
            <Input
              value={projectTitle}
              aria-label="Project title"
              onChange={(event) => setProjectTitle(event.currentTarget.value)}
            />
            <Textarea
              rows={3}
              value={projectDescription}
              aria-label="Project description"
              placeholder="What are you making together?"
              onChange={(event) => setProjectDescription(event.currentTarget.value)}
            />
            <Select
              value={projectVisibility}
              aria-label="Project visibility"
              onChange={(event) => setProjectVisibility(event.currentTarget.value as CollaborationProjectVisibility)}
            >
              <option value="private">Private</option>
              <option value="members_only">Members only</option>
              <option value="link_invite">Link invite</option>
            </Select>
            <Button
              fullWidth
              variant="secondary"
              disabled={!projectTitle.trim() || projectDetailsMutation.isPending}
              onClick={() => projectDetailsMutation.mutate()}
            >
              Save project details
            </Button>
          </div>
        ) : null}

        {canManageMembers ? (
          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-accent-secondary" />
              <p className="text-sm font-medium">Protected review links</p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Links expire after 14 days. Reviewers can listen and leave feedback without becoming members.
            </p>
            <div className="grid gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={createProjectLinkMutation.isPending}
                onClick={() => createProjectLinkMutation.mutate({
                  targetType: "collaboration_project",
                  targetId: project.project.id,
                })}
              >
                <Copy className="size-4" />
                Copy project review link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={
                  !selectedVersion ||
                  selectedVersion.owner_id !== viewer.userId ||
                  createProjectLinkMutation.isPending
                }
                onClick={() => {
                  if (selectedVersion?.owner_id === viewer.userId) {
                    createProjectLinkMutation.mutate({
                      targetType: "song_version",
                      targetId: selectedVersion.id,
                    });
                  }
                }}
              >
                <Copy className="size-4" />
                {selectedVersion?.owner_id === viewer.userId
                  ? "Copy selected-version link"
                  : "Only the version owner can share it"}
              </Button>
            </div>
            {(shareLinksQuery.data ?? []).length ? (
              <div className="space-y-2">
                {(shareLinksQuery.data ?? []).map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-[16px] border border-white/[0.06] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs capitalize">{link.target_type.replaceAll("_", " ")}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {link.is_active ? `${link.use_count} opens` : "Revoked"}
                      </p>
                    </div>
                    {link.is_active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Revoke review link"
                        disabled={revokeProjectLinkMutation.isPending}
                        onClick={() => revokeProjectLinkMutation.mutate(link.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {project.viewerRole === "owner" ? (
          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <p className="text-sm font-medium">Transfer ownership</p>
            <p className="text-xs leading-5 text-muted-foreground">
              The selected accepted member becomes owner and your role becomes admin.
            </p>
            <div className="flex gap-2">
              <Select
                value={transferOwnerId}
                aria-label="New project owner"
                disabled={!isOnline}
                onChange={(event) => setTransferOwnerId(event.currentTarget.value)}
              >
                <option value="">Choose a member…</option>
                {project.members
                  .filter(({ member }) => member.role !== "owner")
                  .map(({ member, profile }) => (
                    <option key={member.profile_id} value={member.profile_id}>
                      {profile?.display_name ?? profile?.username ?? "Project member"}
                    </option>
                  ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!isOnline || !transferOwnerId || transferOwnerMutation.isPending}
                onClick={() => {
                  if (window.confirm("Transfer ownership of this project?")) {
                    transferOwnerMutation.mutate();
                  }
                }}
              >
                Transfer
              </Button>
            </div>
            <Button
              fullWidth
              variant="danger"
              disabled={!isOnline || deleteProjectMutation.isPending}
              onClick={() => {
                if (window.confirm(`Permanently delete "${project.project.title}"? Library songs and cloud originals remain untouched.`)) {
                  deleteProjectMutation.mutate();
                }
              }}
            >
              <Trash2 className="size-4" />
              Delete project
            </Button>
          </div>
        ) : (
          <Button
            className="mt-5"
            fullWidth
            variant="ghost"
            disabled={!isOnline || leaveProjectMutation.isPending}
            onClick={() => {
              if (window.confirm(`Leave "${project.project.title}"? You will immediately lose project and chat access.`)) {
                leaveProjectMutation.mutate();
              }
            }}
          >
            Leave project
          </Button>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Audit trail</p>
            <h2 className="mt-1 font-display text-2xl">Activity</h2>
          </div>
          <Badge variant="neutral">{filteredActivity.length}</Badge>
        </div>

        <div className="mt-4 grid gap-2">
          <Select
            aria-label="Filter activity by member"
            value={activityMemberFilter}
            onChange={(event) => setActivityMemberFilter(event.currentTarget.value)}
          >
            <option value="all">All members</option>
            {project.members.map(({ member, profile }) => (
              <option key={member.profile_id} value={member.profile_id}>
                {profile?.display_name ?? profile?.username ?? "MxTrove member"}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter activity by track"
            value={activityTrackFilter}
            onChange={(event) => setActivityTrackFilter(event.currentTarget.value)}
          >
            <option value="all">All tracks</option>
            {project.tracks.map((track) => (
              <option key={track.id} value={track.id}>{track.track_number}. {track.track_title}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter activity by type"
            value={activityTypeFilter}
            onChange={(event) => setActivityTypeFilter(event.currentTarget.value)}
          >
            <option value="all">All activity</option>
            {activityTypes.map((activityType) => (
              <option key={activityType} value={activityType}>
                {activityType.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-4 space-y-3">
          {filteredActivity.slice(0, activityVisibleCount).map((entry) => {
            const actor = project.members.find(({ member }) => member.profile_id === entry.actor_id)?.profile;
            const metadataTrackId = typeof entry.metadata.track_id === "string" ? entry.metadata.track_id : null;
            const entryTrackId = entry.entity_type === "track" ? entry.entity_id : metadataTrackId;
            const track = project.tracks.find((candidate) => candidate.id === entryTrackId);
            return (
              <div key={entry.id} className="flex gap-3 rounded-[18px] border border-white/[0.055] bg-white/[0.02] px-3 py-3 text-sm">
                <Activity className="mt-0.5 size-4 shrink-0 text-accent-secondary" />
                <div className="min-w-0">
                  <p className="capitalize">{entry.activity_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {actor?.display_name ?? (entry.actor_id ? "Project member" : "MxTrove")}
                    {track ? ` · ${track.track_title}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-subtle-foreground">{formatRelativeTime(entry.created_at)}</p>
                </div>
              </div>
            );
          })}
          {!filteredActivity.length ? (
            <p className="py-3 text-sm text-muted-foreground">
              {project.activity.length ? "No activity matches these filters." : "The room is quiet so far."}
            </p>
          ) : null}
          {filteredActivity.length > activityVisibleCount ? (
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={() => setActivityVisibleCount((current) => current + 12)}
            >
              Show more activity
            </Button>
          ) : null}
        </div>
      </Card>

      {project.conversationId ? (
        <Link to={`/messages/${project.conversationId}`}>
          <Button fullWidth variant="secondary">
            <MessageCircleMore className="size-4" />
            Open project chat
          </Button>
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${project.project.project_type.replace("_", " ")} collaboration`}
        title={project.project.title}
        description={project.project.description ?? "A private room for versions, decisions, and the people making the record."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/projects">
              <Button variant="secondary"><ArrowLeft className="size-4" />Projects</Button>
            </Link>
            {project.conversationId ? (
              <Link to={`/messages/${project.conversationId}`}>
                <Button variant="secondary"><MessageCircleMore className="size-4" />Chat</Button>
              </Link>
            ) : null}
            {canEdit ? (
              <Select
                value={project.project.status}
                className="min-h-11"
                onChange={(event) => statusMutation.mutate(event.currentTarget.value as CollaborationProjectStatus)}
              >
                {projectStatuses.map((status) => <option key={status}>{status}</option>)}
              </Select>
            ) : (
              <Badge variant="accent">{project.project.status}</Badge>
            )}
          </div>
        }
      />
      {!isOnline && projectSnapshot ? (
        <div className="rounded-[18px] border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning">
          Read-only offline snapshot. Audio, feedback, membership, sharing, and project changes require a connection.
        </div>
      ) : null}

      <Tabs
        value={mobilePanel}
        onValueChange={(value) => setMobilePanel(value as MobilePanel)}
        stretch
        className="flex lg:hidden"
        items={[
          { value: "tracks", label: "Tracks" },
          { value: "review", label: "Review" },
          { value: "people", label: "People" },
        ]}
      />

      <div className="hidden min-h-[680px] gap-5 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {trackPanel}
        {reviewPanel}
        {peoplePanel}
      </div>

      <div className="lg:hidden">
        {mobilePanel === "tracks" ? trackPanel : null}
        {mobilePanel === "review" ? reviewPanel : null}
        {mobilePanel === "people" ? peoplePanel : null}
      </div>

      {canEdit && selectedTrack ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border bg-white/[0.025] px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Removing a project track never deletes its Library song or cloud original.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            onClick={() => removeTrackMutation.mutate(selectedTrack.id)}
          >
            <Trash2 className="size-4" />
            Remove track
          </Button>
        </div>
      ) : null}
    </div>
  );
}

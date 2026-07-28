import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import type { ProfilePublicMetrics } from "@/types/domain";

import { followProfile, unfollowProfile, type FollowState, type SocialProfileCard } from "@/features/follows/api";

function patchMetrics(metrics: ProfilePublicMetrics | undefined, delta: Partial<Record<"followers" | "following", number>>) {
  if (!metrics) {
    return metrics;
  }

  return {
    ...metrics,
    followers_count: Math.max(0, metrics.followers_count + (delta.followers ?? 0)),
    following_count: Math.max(0, metrics.following_count + (delta.following ?? 0)),
  };
}

function patchSocialCards(current: SocialProfileCard[] | undefined, profileId: string, nextFollowing: boolean) {
  if (!current) {
    return current;
  }

  return current.map((item) =>
    item.profile.id === profileId
      ? {
          ...item,
          viewerFollowsProfile: nextFollowing,
          metrics: patchMetrics(item.metrics, { followers: nextFollowing ? 1 : -1 }) ?? item.metrics,
        }
      : item,
  );
}

export function FollowButton({
  profileId,
  isFollowing,
  isOwnProfile = false,
  ...props
}: Omit<ButtonProps, "onClick"> & {
  profileId: string;
  isFollowing: boolean;
  isOwnProfile?: boolean;
}) {
  const viewer = useAppViewer();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      if (isOwnProfile) {
        throw new Error("You cannot follow yourself.");
      }

      return isFollowing ? unfollowProfile(profileId) : followProfile(profileId);
    },
    onMutate: async () => {
      if (!viewer.userId || isOwnProfile) {
        return null;
      }

      const nextFollowing = !isFollowing;
      const snapshots = {
        followStates: queryClient.getQueriesData<FollowState>({ queryKey: ["follow-state", viewer.userId] }),
        metrics: queryClient.getQueriesData<ProfilePublicMetrics>({ queryKey: ["profile-metrics"] }),
        connections: queryClient.getQueriesData<SocialProfileCard[]>({ queryKey: ["profile-connections"] }),
        creators: queryClient.getQueriesData<SocialProfileCard[]>({ queryKey: ["creator-discovery"] }),
      };

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["follow-state", viewer.userId] }),
        queryClient.cancelQueries({ queryKey: ["profile-metrics"] }),
        queryClient.cancelQueries({ queryKey: ["profile-connections"] }),
        queryClient.cancelQueries({ queryKey: ["creator-discovery"] }),
      ]);

      queryClient.setQueriesData<FollowState>({ queryKey: ["follow-state", viewer.userId] }, (current) =>
        current ? { ...current, viewerFollowsProfile: nextFollowing } : current,
      );
      queryClient.setQueriesData<ProfilePublicMetrics>({ queryKey: ["profile-metrics", profileId] }, (current) =>
        patchMetrics(current, { followers: nextFollowing ? 1 : -1 }) ?? current,
      );
      queryClient.setQueriesData<ProfilePublicMetrics>({ queryKey: ["profile-metrics", viewer.userId] }, (current) =>
        patchMetrics(current, { following: nextFollowing ? 1 : -1 }) ?? current,
      );
      queryClient.setQueriesData<SocialProfileCard[]>({ queryKey: ["profile-connections"] }, (current) =>
        patchSocialCards(current, profileId, nextFollowing),
      );
      queryClient.setQueriesData<SocialProfileCard[]>({ queryKey: ["creator-discovery"] }, (current) =>
        patchSocialCards(current, profileId, nextFollowing),
      );

      return {
        ...snapshots,
        nextFollowing,
      };
    },
    onSuccess: async (_data, _variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["follow-state", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["profile-metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-connections"] }),
        queryClient.invalidateQueries({ queryKey: ["creator-discovery"] }),
        queryClient.invalidateQueries({ queryKey: ["home-feed", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications", viewer.userId] }),
      ]);
      toast.success(context?.nextFollowing ? "Following." : "Unfollowed.");
    },
    onError: (error, _variables, context) => {
      context?.followStates.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      context?.metrics.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      context?.connections.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      context?.creators.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error(error instanceof Error ? error.message : "Could not update follow state.");
    },
  });

  return (
    <Button
      variant={isFollowing ? "secondary" : "primary"}
      disabled={mutation.isPending || isOwnProfile}
      onClick={() => void mutation.mutateAsync()}
      {...props}
    >
      {!isFollowing ? <UserPlus className="size-4" /> : null}
      {isOwnProfile ? "You" : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

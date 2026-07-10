import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getCurrentProfile, saveProfile } from "@/features/profile/api";
import { ProfileAvatarPanel } from "@/features/profile/profile-avatar-panel";
import { ProfileFormPanel } from "@/features/profile/profile-form-panel";
import { queryClient } from "@/lib/query-client";
import type { ProfileFormValues } from "@/lib/validators";

function toFormValues(profile: Awaited<ReturnType<typeof getCurrentProfile>> | null): Partial<ProfileFormValues> | undefined {
  if (!profile) {
    return undefined;
  }

  return {
    display_name: profile.display_name,
    username: profile.username,
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    website_url: profile.website_url,
    instagram_url: profile.instagram_url,
    spotify_url: profile.spotify_url,
    youtube_url: profile.youtube_url,
    support_url: profile.support_url,
    avatar_asset_id: profile.avatar_asset_id,
  };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const viewer = useAppViewer();

  const profileQuery = useQuery({
    queryKey: ["profile", viewer.userId],
    queryFn: () => getCurrentProfile(viewer.userId),
    enabled: Boolean(viewer.userId),
  });

  const mutation = useMutation({
    mutationFn: async (values: Parameters<typeof saveProfile>[1]) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      return saveProfile(viewer.userId, values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", viewer.userId] });
      toast.success("Profile saved.");
      navigate("/");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save profile.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Welcome"
        title="Set up your musician profile"
        description="Your public route becomes `/@username`, while private library data stays inside your workspace."
      />
      <ProfileAvatarPanel profile={profileQuery.data ?? null} />
      <ProfileFormPanel
        title="Onboarding"
        description="Display name, unique username, optional links, and location are enough to start publishing."
        submitLabel="Finish setup"
        initialValues={toFormValues(profileQuery.data ?? null)}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values);
        }}
        isPending={mutation.isPending}
      />
    </div>
  );
}

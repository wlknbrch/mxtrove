import { useId, useRef, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { getAvatarAssetUrls } from "@/lib/asset-urls";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/domain";

import {
  createAssetRecord,
  getAssetById,
  updateAssetPublicLinks,
} from "@/features/drive/api";
import { useCloudUploadProvider } from "@/features/cloud-providers/use-cloud-upload-provider";
import { updateProfileAvatar } from "@/features/profile/api";

export function ProfileAvatarPanel({
  profile,
}: {
  profile: Profile | null | undefined;
}) {
  const viewer = useAppViewer();
  const {
    provider,
    providerId,
    storedFolders,
    ensureFolders,
  } = useCloudUploadProvider(viewer.userId);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const avatarAssetQuery = useQuery({
    queryKey: ["asset", profile?.avatar_asset_id],
    queryFn: () => getAssetById(profile!.avatar_asset_id!),
    enabled: Boolean(profile?.avatar_asset_id),
  });

  const currentAvatar = avatarAssetQuery.data;

  async function ensureAvatarFolder() {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    return (await ensureFolders()).avatarsFolderId;
  }

  async function syncAvatar(assetId: string | null) {
    if (!viewer.userId) {
      throw new Error("Please sign in first.");
    }

    await updateProfileAvatar(viewer.userId, assetId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profile", viewer.userId] }),
      queryClient.invalidateQueries({ queryKey: ["profile-by-username"] }),
      queryClient.invalidateQueries({ queryKey: ["asset", profile?.avatar_asset_id] }),
    ]);
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!viewer.userId) {
        throw new Error("Please sign in first.");
      }

      const parentFolderId = await ensureAvatarFolder();
      const upload =
        file.size > 20 * 1024 * 1024
          ? await provider.uploadResumable({ file, parentFolderId })
          : await provider.uploadFile({ file, parentFolderId });
      const publicPreview = await provider.createPublicPreview(upload.fileId);
      const asset = await createAssetRecord({
        ownerId: viewer.userId,
        assetType: "avatar",
        accessMode: "public",
        upload: {
          ...upload,
          shareUrl: publicPreview.shareUrl,
          viewUrl: publicPreview.viewUrl,
        },
      });
      await updateAssetPublicLinks({
        assetId: asset.id,
        accessMode: "public",
        shareUrl: publicPreview.shareUrl,
        viewUrl: publicPreview.viewUrl,
      });
      await syncAvatar(asset.id);
      return asset;
    },
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({ queryKey: ["asset", asset.id] });
      toast.success("Avatar updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not upload avatar.");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await syncAvatar(null);
    },
    onSuccess: () => {
      toast.success("Avatar cleared.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not clear avatar.");
    },
  });

  function handleFileSelection(file: File | null | undefined) {
    if (!file) {
      return;
    }

    void uploadMutation.mutateAsync(file);
  }

  function handlePickerKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (uploadMutation.isPending || !viewer.userId) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    inputRef.current?.click();
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Avatar</CardTitle>
          <CardDescription className="mt-2">
            Upload a public profile image. MxTrove stores it in the avatar folder of your default cloud provider so every profile surface can reuse the same source.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            alt={profile?.display_name ?? viewer.email ?? "Current profile"}
            src={getAvatarAssetUrls(currentAvatar)}
            initials={(profile?.display_name ?? viewer.email ?? "MX").slice(0, 2).toUpperCase()}
            className="size-24 text-lg"
          />
          <div className="min-w-0 space-y-2">
            <p className="font-medium">
              {currentAvatar?.display_name ?? currentAvatar?.filename ?? "No avatar uploaded yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {storedFolders?.avatarsFolderId
                ? `Public avatar ready in ${providerId.replace("_", " ")}.`
                : "Connect a cloud provider once if you have not set up an avatar folder yet."}
            </p>
            {!storedFolders ? (
              <Link to="/settings/storage" className="text-sm text-accent hover:text-accent-strong">
                Open cloud storage setup
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            id={inputId}
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => {
              handleFileSelection(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <label
            htmlFor={uploadMutation.isPending || !viewer.userId ? undefined : inputId}
            role="button"
            tabIndex={uploadMutation.isPending || !viewer.userId ? -1 : 0}
            aria-disabled={uploadMutation.isPending || !viewer.userId}
            onKeyDown={handlePickerKeyDown}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              uploadMutation.isPending || !viewer.userId ? "pointer-events-none opacity-50" : "cursor-pointer",
            )}
          >
            <ImagePlus className="size-4" />
            {currentAvatar ? "Replace avatar" : "Upload avatar"}
          </label>
          {profile?.avatar_asset_id ? (
            <Button
              variant="ghost"
              onClick={() => void clearMutation.mutateAsync()}
              disabled={clearMutation.isPending}
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

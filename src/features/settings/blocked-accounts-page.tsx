import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listBlockedProfiles, unblockProfile } from "@/features/privacy/api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

export function BlockedAccountsPage() {
  const blockedQuery = useQuery({
    queryKey: ["blocked-profiles"],
    queryFn: listBlockedProfiles,
  });
  const unblockMutation = useMutation({
    mutationFn: unblockProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blocked-profiles"] });
      toast.success("Profile unblocked.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not unblock this profile."),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Blocked accounts"
        description="Blocked accounts cannot follow, message, invite, heart, or comment across your personal MxTrove surfaces."
      />
      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <SettingsSidebar driveReady />
        <Card>
          {(blockedQuery.data ?? []).length ? (
            <div className="space-y-3">
              {blockedQuery.data!.map((profile) => (
                <div
                  key={profile.profile_id}
                  className="flex flex-wrap items-center gap-4 rounded-[24px] border border-border bg-surface-soft p-4"
                >
                  <Avatar
                    alt={profile.display_name}
                    initials={profile.display_name.slice(0, 2).toUpperCase()}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{profile.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{profile.username} · blocked {formatRelativeTime(profile.blocked_at)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => unblockMutation.mutate(profile.profile_id)}
                    disabled={unblockMutation.isPending}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShieldOff}
              title="No blocked accounts"
              description="Accounts you block will appear here with a direct recovery action."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

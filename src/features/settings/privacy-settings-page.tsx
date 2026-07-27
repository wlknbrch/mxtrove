import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, LockKeyhole, MessageCircle, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  defaultPrivacySettings,
  getPrivacySettings,
  savePrivacySettings,
} from "@/features/privacy/api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";

export function PrivacySettingsPage() {
  const viewer = useAppViewer();
  const privacyQuery = useQuery({
    queryKey: ["privacy-settings", viewer.userId],
    queryFn: () => getPrivacySettings(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const [draft, setDraft] = useState(defaultPrivacySettings);

  useEffect(() => {
    if (!privacyQuery.data) {
      return;
    }
    const {
      profile_id: _profileId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...values
    } = privacyQuery.data;
    setDraft(values);
  }, [privacyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => savePrivacySettings(draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["privacy-settings", viewer.userId] });
      toast.success("Privacy boundaries saved.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save privacy settings.");
    },
  });

  function toggle(key: keyof typeof draft) {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Privacy"
        description="Choose who can find, contact, and invite you. These rules are enforced by the database, not only hidden in the interface."
      />
      <div className="grid gap-6 2xl:grid-cols-[310px_minmax(0,1fr)]">
        <SettingsSidebar driveReady />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-3">
                <LockKeyhole className="size-5 text-accent-secondary" />
                Access boundaries
              </CardTitle>
              <CardDescription>New conversations and project invitations respect these choices immediately.</CardDescription>
            </CardHeader>
            <div className="grid gap-5 lg:grid-cols-3">
              <PrivacySelect
                icon={Eye}
                label="Profile visibility"
                value={draft.profile_visibility}
                onChange={(value) => setDraft((current) => ({
                  ...current,
                  profile_visibility: value as typeof current.profile_visibility,
                }))}
                options={[
                  ["public", "Public"],
                  ["members_only", "MxTrove members only"],
                ]}
              />
              <PrivacySelect
                icon={MessageCircle}
                label="Who can message me"
                value={draft.message_permission}
                onChange={(value) => setDraft((current) => ({
                  ...current,
                  message_permission: value as typeof current.message_permission,
                }))}
                options={permissionOptions}
              />
              <PrivacySelect
                icon={UsersRound}
                label="Who can invite me"
                value={draft.project_invite_permission}
                onChange={(value) => setDraft((current) => ({
                  ...current,
                  project_invite_permission: value as typeof current.project_invite_permission,
                }))}
                options={permissionOptions}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-3">
                <Search className="size-5 text-accent-secondary" />
                Profile signals
              </CardTitle>
            </CardHeader>
            <div className="grid gap-3 md:grid-cols-2">
              {([
                ["show_location", "Show location", "Display your location on the public profile."],
                ["show_follower_counts", "Show follower counts", "Let others see your social reach."],
                ["show_activity_status", "Show activity status", "Expose recent activity signals."],
                ["allow_profile_discovery", "Allow discovery", "Include the profile in creator search."],
              ] as const).map(([key, label, description]) => (
                <button
                  key={key}
                  type="button"
                  className="flex items-center gap-4 rounded-[22px] border border-border bg-surface-soft p-4 text-left"
                  onClick={() => toggle(key)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{label}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
                  </span>
                  <span className={cn(
                    "relative h-7 w-12 rounded-full border",
                    draft[key] ? "border-accent/50 bg-accent/75" : "border-border bg-background-muted",
                  )}>
                    <span className={cn(
                      "absolute top-1 size-4 rounded-full bg-white transition-transform",
                      draft[key] ? "translate-x-6" : "translate-x-1",
                    )} />
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || privacyQuery.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save privacy"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const permissionOptions = [
  ["everyone", "Everyone"],
  ["people_i_follow", "People I follow"],
  ["mutual_follows", "Mutual follows"],
  ["nobody", "Nobody"],
] as const;

function PrivacySelect({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-accent-secondary" />
        {label}
      </span>
      <Select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </Select>
    </label>
  );
}

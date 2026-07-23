import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clock3, MailOpen, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  acceptProjectInviteById,
  declineProjectInviteById,
  listPendingInvites,
} from "@/features/projects/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { queryClient } from "@/lib/query-client";
import { formatRelativeTime } from "@/lib/utils";

export function InvitesPage() {
  const viewer = useAppViewer();
  const navigate = useNavigate();
  const invitesQuery = useQuery({
    queryKey: ["project-invites", viewer.userId],
    queryFn: () => listPendingInvites(viewer.userId!),
    enabled: Boolean(viewer.userId),
  });
  const acceptMutation = useMutation({
    mutationFn: acceptProjectInviteById,
    onSuccess: async (projectId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-invites", viewer.userId] }),
        queryClient.invalidateQueries({ queryKey: ["projects", viewer.userId] }),
      ]);
      toast.success("Invitation accepted.");
      navigate(`/projects/${projectId}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not accept the invitation."),
  });
  const declineMutation = useMutation({
    mutationFn: declineProjectInviteById,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-invites", viewer.userId] });
      toast.success("Invitation declined.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not decline the invitation."),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collaboration"
        title="Invitations"
        description="Project roles become active only after you accept. Email invite tokens remain one-time secrets and are never stored in readable form."
      />
      {(invitesQuery.data ?? []).length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {invitesQuery.data!.map((invite) => (
            <Card key={invite.invite_id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="accent">{invite.project_type.replace("_", " ")}</Badge>
                    <Badge variant="neutral">{invite.role}</Badge>
                  </div>
                  <h2 className="mt-5 font-display text-3xl">{invite.project_title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Invited by {invite.inviter_name}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  expires {formatRelativeTime(invite.expires_at)}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => acceptMutation.mutate(invite.invite_id)} disabled={acceptMutation.isPending}>
                  <Check className="size-4" />Accept
                </Button>
                <Button variant="secondary" onClick={() => declineMutation.mutate(invite.invite_id)} disabled={declineMutation.isPending}>
                  <X className="size-4" />Decline
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MailOpen}
          title="No open invitations"
          description="Profile-targeted project invitations will appear here until accepted, declined, revoked, or expired."
        />
      )}
    </div>
  );
}

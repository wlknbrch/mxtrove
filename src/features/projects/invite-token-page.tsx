import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Link2Off, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  acceptProjectInvite,
  declineProjectInvite,
  resolveProjectInvite,
} from "@/features/projects/api";

export function InviteTokenPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const inviteQuery = useQuery({
    queryKey: ["project-invite-token", token],
    queryFn: () => resolveProjectInvite(token),
    enabled: Boolean(token),
    retry: false,
  });
  const acceptMutation = useMutation({
    mutationFn: () => acceptProjectInvite(token),
    onSuccess: (projectId) => {
      toast.success("Welcome to the project.");
      navigate(`/projects/${projectId}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not accept this invitation."),
  });
  const declineMutation = useMutation({
    mutationFn: () => declineProjectInvite(token),
    onSuccess: () => navigate("/invites"),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not decline this invitation."),
  });

  const invite = inviteQuery.data;
  if (inviteQuery.isError || (!inviteQuery.isPending && !invite)) {
    return (
      <div className="mx-auto max-w-2xl py-14">
        <Card>
          <Link2Off className="size-8 text-danger" />
          <h1 className="mt-5 font-display text-4xl">Invitation unavailable</h1>
          <p className="mt-3 text-muted-foreground">This link is invalid, expired, revoked, or already used.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Private project invitation"
        title={invite?.project_title ?? "Opening invitation…"}
        description="Accepting adds your account to the project and its private project conversation with the assigned role."
      />
      <Card>
        {invite ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">{invite.project_type.replace("_", " ")}</Badge>
              <Badge variant="neutral">{invite.role}</Badge>
              <Badge variant={invite.status === "pending" ? "success" : "warning"}>{invite.status}</Badge>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              This invitation expires {new Date(invite.expires_at).toLocaleString()}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending || invite.status !== "pending"}>
                <Check className="size-4" />Accept invitation
              </Button>
              <Button variant="secondary" onClick={() => declineMutation.mutate()} disabled={declineMutation.isPending || invite.status !== "pending"}>
                <X className="size-4" />Decline
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Resolving the private invitation…</p>
        )}
      </Card>
    </div>
  );
}

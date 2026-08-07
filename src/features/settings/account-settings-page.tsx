import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, Laptop, Mail, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cancelAccountDeletion,
  confirmAccountPassword,
  requestAccountDeletion,
  updateAccountEmail,
  updateAccountPassword,
} from "@/features/privacy/account-api";
import { SettingsSidebar } from "@/features/settings/settings-shell";
import { useAuth } from "@/hooks/use-auth";

export function AccountSettingsPage() {
  const { session, user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [deletionPassword, setDeletionPassword] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState("");

  const passwordMutation = useMutation({
    mutationFn: () => updateAccountPassword(password),
    onSuccess: () => {
      setPassword("");
      toast.success("Password updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update password."),
  });
  const emailMutation = useMutation({
    mutationFn: () => updateAccountEmail(email.trim()),
    onSuccess: () => toast.success("Check both email addresses to confirm the change."),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update email."),
  });
  const deletionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("The current account does not have a confirmed email address.");
      }
      await confirmAccountPassword({
        email: user.email,
        password: deletionPassword,
      });
      return requestAccountDeletion({ gracePeriodDays: 14, deleteCloudFiles: false });
    },
    onSuccess: (scheduledFor) => {
      setDeletionPassword("");
      setConfirmDeletion("");
      toast.success(`Account deactivated. Recovery remains available until ${new Date(scheduledFor).toLocaleDateString()}.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not schedule deletion."),
  });
  const recoveryMutation = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => toast.success("Account deletion cancelled and profile restored."),
    onError: (error) => toast.error(error instanceof Error ? error.message : "No recoverable deletion request was found."),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account"
        description="Manage credentials, the current authenticated session, and the recoverable account lifecycle."
      />
      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <SettingsSidebar />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-3">
                <Laptop className="size-5 text-accent-secondary" />
                Current session
              </CardTitle>
              <CardDescription>
                Supabase exposes the current browser session to the web client. Full device history requires an
                admin-side session service and is therefore not fabricated here.
              </CardDescription>
            </CardHeader>
            <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-border bg-surface-soft p-4">
              <Badge variant={session ? "success" : "warning"}>{session ? "Authenticated" : "Unavailable"}</Badge>
              <span className="text-sm text-muted-foreground">
                {user?.email ?? "No current account"} · session expires{" "}
                {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "unknown"}
              </span>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-3 text-2xl">
                  <KeyRound className="size-5 text-accent-secondary" />
                  Password
                </CardTitle>
              </CardHeader>
              <Input
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="At least 10 characters"
              />
              <Button
                className="mt-4"
                onClick={() => passwordMutation.mutate()}
                disabled={password.length < 10 || passwordMutation.isPending}
              >
                Update password
              </Button>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-3 text-2xl">
                  <Mail className="size-5 text-accent-secondary" />
                  Email
                </CardTitle>
              </CardHeader>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="you@example.com"
              />
              <Button
                className="mt-4"
                onClick={() => emailMutation.mutate()}
                disabled={!email.trim() || emailMutation.isPending}
              >
                Change email
              </Button>
            </Card>
          </div>

          <Card className="border-danger/25">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-3 text-danger">
                <AlertTriangle className="size-5" />
                Account lifecycle
              </CardTitle>
              <CardDescription>
                Deletion first deactivates public surfaces, then waits 14 days. Cloud originals remain untouched
                unless a future explicit cloud-file removal request is confirmed. Enter your current password to
                create a fresh authentication proof before scheduling the deletion.
              </CardDescription>
            </CardHeader>
            <Input
              className="mb-3"
              type="password"
              autoComplete="current-password"
              value={deletionPassword}
              onChange={(event) => setDeletionPassword(event.currentTarget.value)}
              placeholder="Current password"
            />
            <Input
              value={confirmDeletion}
              onChange={(event) => setConfirmDeletion(event.currentTarget.value)}
              placeholder='Type "DELETE" to schedule account deletion'
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="danger"
                onClick={() => deletionMutation.mutate()}
                disabled={
                  confirmDeletion !== "DELETE" ||
                  !deletionPassword ||
                  deletionMutation.isPending
                }
              >
                <Trash2 className="size-4" />
                Deactivate and schedule deletion
              </Button>
              <Button variant="secondary" onClick={() => recoveryMutation.mutate()}>
                <RotateCcw className="size-4" />
                Recover account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

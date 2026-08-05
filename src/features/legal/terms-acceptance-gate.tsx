import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileCheck2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  acceptTermsOfService,
  getTermsAcceptance,
  type TermsAcceptance,
} from "@/features/legal/api";
import {
  clearPendingTermsAcceptance,
  CURRENT_TERMS_LAST_UPDATED,
  CURRENT_TERMS_VERSION,
  hasPendingTermsAcceptance,
} from "@/features/legal/terms";
import { TermsDialog } from "@/features/legal/terms-dialog";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";

export function hasAcceptedCurrentTerms(acceptance: TermsAcceptance | null | undefined) {
  return Boolean(
    acceptance?.accepted_at
    && acceptance.terms_version === CURRENT_TERMS_VERSION,
  );
}

export function TermsAcceptanceGate({
  userId,
  allowPendingAcceptance = false,
  children,
}: PropsWithChildren<{ userId: string; allowPendingAcceptance?: boolean }>) {
  const { signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const pendingAcceptanceAttemptedRef = useRef(false);
  const acceptanceQuery = useQuery({
    queryKey: ["terms-acceptance", userId],
    queryFn: () => getTermsAcceptance(userId),
  });
  const mutation = useMutation({
    mutationFn: () => acceptTermsOfService(CURRENT_TERMS_VERSION),
    onSuccess: (acceptance) => {
      clearPendingTermsAcceptance();
      queryClient.setQueryData(["terms-acceptance", userId], acceptance);
      toast.success("Terms accepted. Welcome to MxTrove.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Terms acceptance could not be saved.");
    },
  });

  useEffect(() => {
    if (
      !acceptanceQuery.isPending
      && !hasAcceptedCurrentTerms(acceptanceQuery.data)
      && allowPendingAcceptance
      && hasPendingTermsAcceptance()
      && !pendingAcceptanceAttemptedRef.current
    ) {
      pendingAcceptanceAttemptedRef.current = true;
      mutation.mutate();
    }
  }, [acceptanceQuery.data, acceptanceQuery.isPending, allowPendingAcceptance]);

  if (acceptanceQuery.isPending || (mutation.isPending && hasPendingTermsAcceptance())) {
    return (
      <AuthLayout>
        <Card className="mx-auto max-w-xl">
          <CardTitle>Preparing your MxTrove account…</CardTitle>
          <CardDescription className="mt-2">Checking the current Terms agreement.</CardDescription>
        </Card>
      </AuthLayout>
    );
  }

  if (acceptanceQuery.isError) {
    return (
      <AuthLayout>
        <Card className="mx-auto max-w-xl">
          <CardTitle>We could not check your agreement</CardTitle>
          <CardDescription className="mt-2">
            Apply the latest Supabase migration, then retry this screen.
          </CardDescription>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => acceptanceQuery.refetch()}>Try again</Button>
            <Button variant="ghost" onClick={() => signOut()}>Sign out</Button>
          </div>
        </Card>
      </AuthLayout>
    );
  }

  if (hasAcceptedCurrentTerms(acceptanceQuery.data)) {
    return children;
  }

  return (
    <AuthLayout>
      <Card className="mx-auto max-w-xl border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.16),transparent_38%),rgba(12,9,25,0.94)]">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-[18px] border border-accent/25 bg-accent/10 text-accent-secondary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <CardTitle className="mt-5">One agreement before you continue</CardTitle>
          <CardDescription className="mt-2 leading-6">
            MxTrove now records acceptance of its Terms of Service. This applies to existing accounts too,
            so everyone uses the service under the same current agreement.
          </CardDescription>
        </CardHeader>

        <div className="grid gap-4">
          <button
            type="button"
            className="flex items-center justify-between gap-4 rounded-[20px] border border-border bg-white/[0.03] px-4 py-4 text-left transition-colors hover:border-accent/35 hover:bg-accent/[0.07]"
            onClick={() => setIsTermsOpen(true)}
          >
            <span>
              <span className="block font-medium">Read the Terms of Service</span>
              <span className="mt-1 block text-sm text-muted-foreground">Updated {CURRENT_TERMS_LAST_UPDATED}</span>
            </span>
            <FileCheck2 className="size-5 shrink-0 text-accent-secondary" aria-hidden="true" />
          </button>

          <label className="flex items-start gap-3 rounded-[18px] border border-border px-4 py-3 text-sm leading-6">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-[rgb(var(--accent-rgb))]"
              checked={accepted}
              onChange={(event) => setAccepted(event.currentTarget.checked)}
            />
            <span>I have read and accept the current Terms of Service.</span>
          </label>

          <Button disabled={!accepted || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving agreement…" : "Accept and continue"}
          </Button>
          <Button variant="ghost" onClick={() => signOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out instead
          </Button>
        </div>
      </Card>
      <TermsDialog open={isTermsOpen} onOpenChange={setIsTermsOpen} />
    </AuthLayout>
  );
}

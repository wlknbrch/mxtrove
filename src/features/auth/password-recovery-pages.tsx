import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, updateRecoveredPassword } from "@/features/auth/api";
import { useAuth } from "@/hooks/use-auth";
import { envState } from "@/lib/env";

const emailSchema = z.object({
  email: z.string().email("Use a valid email address."),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Passwords must be at least 8 characters."),
});

type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ email }: EmailValues) => requestPasswordReset(email),
    onSuccess: () => setEmailSent(true),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "The recovery email could not be sent.");
    },
  });

  return (
    <AuthLayout>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-[18px] border border-accent/25 bg-accent/10 text-accent">
            {emailSent ? <CheckCircle2 className="size-5" /> : <Mail className="size-5" />}
          </div>
          <CardTitle className="mt-5">{emailSent ? "Check your inbox" : "Reset your password"}</CardTitle>
          <CardDescription className="mt-2">
            {emailSent
              ? "If an account matches that address, Supabase has sent a secure password-reset link."
              : "Enter the email address connected to your MxTrove account."}
          </CardDescription>
        </CardHeader>

        {emailSent ? (
          <div className="grid gap-3">
            <p className="rounded-[18px] border border-border bg-white/3 px-4 py-3 text-sm text-muted-foreground">
              For privacy, MxTrove shows the same confirmation whether or not an account exists.
            </p>
            <Button variant="secondary" onClick={() => setEmailSent(false)}>Send another link</Button>
            <Button variant="ghost" onClick={() => navigate("/login")}>Back to sign in</Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Email</span>
              <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
              {form.formState.errors.email ? <span className="text-xs text-danger">{form.formState.errors.email.message}</span> : null}
            </label>
            <Button type="submit" disabled={mutation.isPending || !envState.hasSupabase}>
              {mutation.isPending ? "Sending…" : "Send reset link"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/login")}>Back to sign in</Button>
          </form>
        )}
      </Card>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ password }: PasswordValues) => updateRecoveredPassword(password),
    onSuccess: () => {
      toast.success("Your password has been updated.");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "The password could not be updated.");
    },
  });

  return (
    <AuthLayout>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-[18px] border border-accent/25 bg-accent/10 text-accent">
            <KeyRound className="size-5" />
          </div>
          <CardTitle className="mt-5">Choose a new password</CardTitle>
          <CardDescription className="mt-2">
            Use at least eight characters. You only need to enter the new password once.
          </CardDescription>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Verifying your recovery link…</p>
        ) : user ? (
          <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <label className="grid gap-2">
              <span className="text-sm font-medium">New password</span>
              <span className="relative">
                <Input
                  className="pr-12"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-[15px] text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
              {form.formState.errors.password ? <span className="text-xs text-danger">{form.formState.errors.password.message}</span> : null}
            </label>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <div className="grid gap-4">
            <p className="rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              This recovery link is invalid or has expired. Request a fresh link to continue.
            </p>
            <Link className="text-sm font-medium text-accent hover:text-accent-strong" to="/forgot-password">
              Request another reset link
            </Link>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}

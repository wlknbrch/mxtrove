import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { TermsDialog } from "@/features/legal/terms-dialog";
import { useAuth } from "@/hooks/use-auth";
import { envState } from "@/lib/env";

import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "@/features/auth/api";

const authSchema = z.object({
  email: z.string().email("Use a valid email address."),
  password: z.string().min(8, "Passwords must be at least 8 characters."),
  displayName: z.string().optional(),
});

type AuthValues = z.infer<typeof authSchema>;

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AuthValues) => {
      if (mode === "login") {
        await signInWithPassword({ email: values.email, password: values.password });
        return;
      }

      await signUpWithPassword({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        termsAccepted: acceptedTerms,
      });
    },
    onSuccess: () => {
      toast.success(mode === "login" ? "Welcome back." : "Check your email to confirm your account.");
      navigate(mode === "login" ? "/" : "/onboarding");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    },
  });

  const googleMutation = useMutation({
    mutationFn: () => signInWithGoogle({
      termsAccepted: mode === "register" && acceptedTerms,
    }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Google sign-in could not be started.");
    },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{mode === "login" ? "Sign in to MxTrove" : "Create your MxTrove account"}</CardTitle>
              <CardDescription className="mt-2">
                Auth is powered by Supabase. Originals stay in each user's connected cloud account.
              </CardDescription>
            </div>
            {envState.hasSupabase ? <Badge variant="success">Supabase ready</Badge> : <Badge variant="warning">Setup required</Badge>}
          </div>
        </CardHeader>

        <div className="mb-5">
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "login" | "register")}
            items={[
              { value: "login", label: "Login" },
              { value: "register", label: "Register" },
            ]}
          />
        </div>

        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            await mutation.mutateAsync(values);
          })}
        >
          {mode === "register" ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium">Display name</span>
              <Input placeholder="Kai Orion" {...form.register("displayName")} />
            </label>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-medium">Email</span>
            <Input type="email" placeholder="you@example.com" {...form.register("email")} />
            {form.formState.errors.email ? <span className="text-xs text-danger">{form.formState.errors.email.message}</span> : null}
          </label>

          {mode === "register" ? (
            <div className="grid gap-3 rounded-[20px] border border-border bg-white/[0.025] px-4 py-4">
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-[rgb(var(--accent-rgb))]"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.currentTarget.checked)}
                />
                <span>I have read and accept the Terms of Service.</span>
              </label>
              <button
                type="button"
                className="w-fit text-sm font-medium text-accent-secondary hover:text-foreground"
                onClick={() => setIsTermsOpen(true)}
              >
                Read the Terms without leaving this page
              </button>
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="flex items-center justify-between gap-3 text-sm font-medium">
              Password
              {mode === "login" ? (
                <Link className="text-xs text-accent hover:text-accent-strong" to="/forgot-password">
                  Forgot password?
                </Link>
              ) : null}
            </span>
            <span className="relative">
              <Input
                className="pr-12"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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

          {!envState.hasSupabase ? (
            <div className="rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to use real authentication.
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={
              mutation.isPending
              || !envState.hasSupabase
              || (mode === "register" && !acceptedTerms)
            }
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-subtle-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={
              googleMutation.isPending
              || !envState.hasSupabase
              || (mode === "register" && !acceptedTerms)
            }
            onClick={() => googleMutation.mutate()}
          >
            <GoogleMark />
            Continue with Google
          </Button>
        </form>
      </Card>
      <TermsDialog open={isTermsOpen} onOpenChange={setIsTermsOpen} />
    </AuthLayout>
  );
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" />
    </svg>
  );
}

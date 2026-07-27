import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { envState } from "@/lib/env";

import { signInWithPassword, signUpWithPassword } from "@/features/auth/api";

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
                Auth is powered by Supabase. Storage stays in each user’s own Google Drive.
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

          <label className="grid gap-2">
            <span className="text-sm font-medium">Password</span>
            <Input type="password" placeholder="At least 8 characters" {...form.register("password")} />
            {form.formState.errors.password ? <span className="text-xs text-danger">{form.formState.errors.password.message}</span> : null}
          </label>

          {!envState.hasSupabase ? (
            <div className="rounded-[18px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to use real authentication.
            </div>
          ) : null}

          <Button type="submit" disabled={mutation.isPending || !envState.hasSupabase}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}

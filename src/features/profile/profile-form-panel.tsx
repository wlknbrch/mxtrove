import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  profileSchema,
  type ProfileFormValues,
} from "@/lib/validators";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent-secondary/80">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export function ProfileFormPanel({
  title,
  description,
  submitLabel,
  initialValues,
  onSubmit,
  isPending,
}: {
  title: string;
  description: string;
  submitLabel: string;
  initialValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  isPending?: boolean;
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: initialValues?.display_name ?? "",
      username: initialValues?.username ?? "",
      bio: initialValues?.bio ?? "",
      location: initialValues?.location ?? "",
      website_url: initialValues?.website_url ?? "",
      instagram_url: initialValues?.instagram_url ?? "",
      spotify_url: initialValues?.spotify_url ?? "",
      youtube_url: initialValues?.youtube_url ?? "",
      support_url: initialValues?.support_url ?? "",
      avatar_asset_id: initialValues?.avatar_asset_id ?? null,
    },
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2">{description}</CardDescription>
        </div>
      </CardHeader>

      <form
        className="grid gap-6"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
        })}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Display Name" error={form.formState.errors.display_name?.message}>
            <Input placeholder="Kai Orion" {...form.register("display_name")} />
          </Field>
          <Field label="Username" error={form.formState.errors.username?.message}>
            <Input placeholder="kai_orion" {...form.register("username")} />
          </Field>
        </div>

        <Field label="Bio" error={form.formState.errors.bio?.message}>
          <Textarea
            placeholder="What kind of music and process should people expect here?"
            {...form.register("bio")}
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Location" error={form.formState.errors.location?.message}>
            <Input placeholder="Berlin, Germany" {...form.register("location")} />
          </Field>
          <Field label="Website" error={form.formState.errors.website_url?.message}>
            <Input placeholder="https://your-site.com" {...form.register("website_url")} />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Instagram" error={form.formState.errors.instagram_url?.message}>
            <Input placeholder="https://instagram.com/handle" {...form.register("instagram_url")} />
          </Field>
          <Field label="Spotify" error={form.formState.errors.spotify_url?.message}>
            <Input placeholder="https://open.spotify.com/artist/..." {...form.register("spotify_url")} />
          </Field>
          <Field label="YouTube" error={form.formState.errors.youtube_url?.message}>
            <Input placeholder="https://youtube.com/@handle" {...form.register("youtube_url")} />
          </Field>
          <Field label="Support Link" error={form.formState.errors.support_url?.message}>
            <Input placeholder="https://ko-fi.com/you" {...form.register("support_url")} />
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

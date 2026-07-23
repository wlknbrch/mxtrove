import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ListMusic, Play, Plus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { usePlayerStore } from "@/components/audio/player-store";
import { Waveform } from "@/components/audio/waveform";
import { MxShareMark } from "@/components/layout/mxshare-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProtectedMediaReadUrl } from "@/features/media-processing/api";
import {
  createSharedProjectFeedback,
  getSharedProjectByToken,
} from "@/features/projects/api";
import { useAppViewer } from "@/hooks/use-app-viewer";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { cn, formatDuration } from "@/lib/utils";
import { normalizeWaveformData } from "@/lib/waveform";
import type { FeedbackCategory } from "@/types/domain";

const categories: FeedbackCategory[] = [
  "general",
  "arrangement",
  "mix",
  "vocals",
  "lyrics",
  "sound_design",
  "mastering",
  "performance",
  "technical",
];

export function SharedProjectPage({ token }: { token: string }) {
  const viewer = useAppViewer();
  const { activeTrackId, currentTimeSeconds, enqueue, requestSeek } = usePlayerStore();
  const query = useQuery({
    queryKey: ["shared-project", token],
    queryFn: () => getSharedProjectByToken(token),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [draft, setDraft, clearDraft] = useLocalDraft(
    `mxshare:draft:shared-review:${viewer.userId ?? "guest"}:${token.slice(0, 12)}`,
    {
      start: "0",
      end: "",
      title: "",
      body: "",
      category: "general" as FeedbackCategory,
      priority: "normal" as "low" | "normal" | "high" | "blocking",
    },
  );

  useEffect(() => {
    if (query.data?.tracks.length && !query.data.tracks.some(({ track }) => track.id === selectedTrackId)) {
      setSelectedTrackId(query.data.tracks[0].track.id);
    }
  }, [query.data, selectedTrackId]);

  const selected = query.data?.tracks.find(({ track }) => track.id === selectedTrackId)
    ?? query.data?.tracks[0]
    ?? null;
  const waveform = normalizeWaveformData(selected?.protectedAsset?.waveform_data);
  const duration = selected?.protectedAsset?.duration_seconds ?? waveform?.durationSeconds ?? null;
  const feedback = (query.data?.feedbackThreads ?? []).filter(
    (thread) => thread.song_version_id === selected?.version?.id,
  );

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.version) throw new Error("Choose a playable project version first.");
      return createSharedProjectFeedback({
        token,
        trackId: selected.track.id,
        versionId: selected.version.id,
        startSeconds: Number(draft.start) || 0,
        endSeconds: draft.end ? Number(draft.end) : null,
        title: draft.title,
        body: draft.body,
        category: draft.category,
        priority: draft.priority,
      });
    },
    onSuccess: () => {
      clearDraft();
      toast.success("Review feedback sent to the project.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send review feedback."),
  });

  async function playSelected(seekSeconds?: number) {
    if (!selected?.version || !selected.protectedAsset) {
      toast.error("This shared version has no protected playback file.");
      return;
    }
    const readUrl = await createProtectedMediaReadUrl(selected.protectedAsset.id, token);
    enqueue([
      {
        id: `shared:${selected.version.id}`,
        versionId: selected.version.id,
        title: selected.track.track_title,
        artistName: query.data?.project.title ?? "Shared project",
        src: readUrl,
        durationSeconds: duration,
        waveform,
        versionLabel: selected.version.version_label,
        queueGroupLabel: "Protected review link",
      },
    ], `shared:${selected.version.id}`, true);
    if (typeof seekSeconds === "number") requestSeek(seekSeconds);
  }

  if (query.isPending) {
    return <SharedProjectShell><Card>Opening protected project…</Card></SharedProjectShell>;
  }
  if (!query.data || query.isError) {
    return (
      <SharedProjectShell>
        <Card>
          <ShieldCheck className="size-8 text-accent-secondary" />
          <h1 className="mt-5 font-display text-4xl">Shared project unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            This link is invalid, expired, revoked, or has reached its access limit.
          </p>
        </Card>
      </SharedProjectShell>
    );
  }

  return (
    <SharedProjectShell>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="p-0">
          <div className="border-b border-border p-5">
            <Badge variant="accent">{query.data.project.project_type.replace("_", " ")}</Badge>
            <h1 className="mt-4 font-display text-4xl leading-none">{query.data.project.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {query.data.project.description ?? `Shared by ${query.data.owner.display_name}`}
            </p>
          </div>
          <div className="space-y-2 p-3">
            {query.data.tracks.map((entry) => (
              <button
                key={entry.track.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left",
                  entry.track.id === selected?.track.id
                    ? "border-accent/35 bg-accent/10"
                    : "border-transparent hover:border-border",
                )}
                onClick={() => setSelectedTrackId(entry.track.id)}
              >
                <span className="text-sm text-muted-foreground">{entry.track.track_number}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{entry.track.track_title}</span>
                <ListMusic className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Protected listening room</p>
                  <h2 className="mt-2 font-display text-4xl">{selected.track.track_title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selected.version
                      ? `V${selected.version.version_number} · ${selected.version.version_label}`
                      : "No active version is shared for this track."}
                  </p>
                </div>
                <Button disabled={!selected.protectedAsset} onClick={() => void playSelected()}>
                  <Play className="size-4 fill-current" />
                  Play
                </Button>
              </div>
              <Waveform
                className="mt-6 h-24"
                waveform={waveform}
                durationSeconds={duration}
                currentTime={activeTrackId === `shared:${selected.version?.id}` ? currentTimeSeconds : 0}
                onSeek={(seconds) => void playSelected(seconds)}
                markers={feedback.map((thread) => ({
                  id: thread.id,
                  timeSeconds: thread.start_seconds,
                  label: thread.title ?? thread.category.replace("_", " "),
                  status: thread.status,
                }))}
                onMarkerSelect={(_id, seconds) => void playSelected(Math.max(0, seconds - 2))}
                variant="preview"
              />
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{formatDuration(activeTrackId === `shared:${selected.version?.id}` ? currentTimeSeconds : 0)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </Card>

            {query.data.permission === "review" ? (
              <Card>
                <p className="text-xs uppercase tracking-[0.2em] text-accent-secondary">Review access</p>
                <h2 className="mt-2 font-display text-3xl">Add time-coded feedback</h2>
                {viewer.userId ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.start}
                      aria-label="Feedback start in seconds"
                      onChange={(event) => {
                        const start = event.currentTarget.value;
                        setDraft((current) => ({ ...current, start }));
                      }}
                    />
                    <Input
                      type="number"
                      min={draft.start || "0"}
                      step="0.1"
                      value={draft.end}
                      placeholder="End (optional)"
                      onChange={(event) => {
                        const end = event.currentTarget.value;
                        setDraft((current) => ({ ...current, end }));
                      }}
                    />
                    <Select
                      value={draft.category}
                      onChange={(event) => {
                        const category = event.currentTarget.value as FeedbackCategory;
                        setDraft((current) => ({ ...current, category }));
                      }}
                    >
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </Select>
                    <Select
                      value={draft.priority}
                      onChange={(event) => {
                        const priority = event.currentTarget.value as typeof draft.priority;
                        setDraft((current) => ({ ...current, priority }));
                      }}
                    >
                      {["low", "normal", "high", "blocking"].map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </Select>
                    <Input
                      className="md:col-span-2"
                      value={draft.title}
                      placeholder="Marker title (optional)"
                      onChange={(event) => {
                        const title = event.currentTarget.value;
                        setDraft((current) => ({ ...current, title }));
                      }}
                    />
                    <Textarea
                      className="md:col-span-2"
                      value={draft.body}
                      placeholder="What should the project team hear here?"
                      onChange={(event) => {
                        const body = event.currentTarget.value;
                        setDraft((current) => ({ ...current, body }));
                      }}
                    />
                    <Button
                      className="md:col-span-2"
                      disabled={!draft.body.trim() || feedbackMutation.isPending}
                      onClick={() => feedbackMutation.mutate()}
                    >
                      <Plus className="size-4" />
                      Add at {formatDuration(Number(draft.start) || 0)}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[20px] border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      Listening works without an account. Sign in to submit review feedback.
                    </p>
                    <Link to="/login" className="mt-3 inline-flex">
                      <Button size="sm">Sign in to review</Button>
                    </Link>
                  </div>
                )}
              </Card>
            ) : null}
          </div>
        ) : (
          <Card>No playable tracks are currently included in this share link.</Card>
        )}
      </div>
    </SharedProjectShell>
  );
}

function SharedProjectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell min-h-screen px-4 py-6 pb-36 md:px-8">
      <header className="mx-auto mb-10 flex max-w-7xl items-center justify-between">
        <Link to="/login" className="flex items-center gap-3">
          <MxShareMark className="size-11" />
          <div>
            <p className="font-display text-2xl">MxShare</p>
            <p className="text-xs text-muted-foreground">Protected collaboration review</p>
          </div>
        </Link>
        <Badge variant="success"><ShieldCheck className="mr-1 size-3.5" />Protected</Badge>
      </header>
      <main className="mx-auto max-w-7xl space-y-7">{children}</main>
    </div>
  );
}

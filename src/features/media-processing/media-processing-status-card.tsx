import { CheckCircle2, LoaderCircle, TriangleAlert, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type { MediaProcessingJob } from "@/types/domain";

function formatState(job: MediaProcessingJob | null) {
  if (!job) {
    return null;
  }

  if (job.status === "completed") {
    return {
      label: "Preview ready",
      tone: "success" as const,
      icon: CheckCircle2,
    };
  }

  if (job.status === "failed" || job.status === "cancelled" || job.status === "expired") {
    return {
      label: "Needs attention",
      tone: "warning" as const,
      icon: TriangleAlert,
    };
  }

  return {
    label: "Generating preview",
    tone: "accent" as const,
    icon: LoaderCircle,
  };
}

export function MediaProcessingStatusCard({
  job,
  error,
  title = "Automatic preview generation",
  emptyMessage = "Upload a private original and MxTrove will generate the browser-safe MP3 preview for you.",
}: {
  job: MediaProcessingJob | null;
  error?: string | null;
  title?: string;
  emptyMessage?: string;
}) {
  const state = formatState(job);
  const Icon = state?.icon ?? Wand2;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-accent-secondary/80">Media worker</p>
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        {state ? (
          <Badge variant={state.tone}>
            <Icon className={state.icon === LoaderCircle ? "size-4 animate-spin" : "size-4"} />
            {state.label}
          </Badge>
        ) : null}
      </div>

      {job ? (
        <div className="space-y-3">
          <p className="text-sm leading-7 text-muted-foreground">{job.stage}</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary"
              style={{ width: `${Math.max(4, job.progress)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>{job.progress}%</span>
            {job.duration_seconds ? <span>{Math.round(job.duration_seconds)}s</span> : null}
            {job.detected_codec ? <span>{job.detected_codec}</span> : null}
          </div>
        </div>
      ) : (
        <p className="text-sm leading-7 text-muted-foreground">{emptyMessage}</p>
      )}

      {error ? (
        <div className="rounded-[18px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-7 text-danger">
          {error}
        </div>
      ) : null}
    </Card>
  );
}

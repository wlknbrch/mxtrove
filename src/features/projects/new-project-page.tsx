import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Disc3, Layers3, ListMusic, Music2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/features/projects/api";
import { cn } from "@/lib/utils";
import type { CollaborationProjectType, CollaborationProjectVisibility } from "@/types/domain";

const projectTypes = [
  { value: "single", label: "Single", icon: Music2, description: "One song with room for version history." },
  { value: "ep", label: "EP", icon: Disc3, description: "A focused multi-track body of work." },
  { value: "album", label: "Album", icon: Layers3, description: "A full sequence with longer review cycles." },
  { value: "loose_collection", label: "Loose collection", icon: ListMusic, description: "Ideas without a fixed release shape." },
] as const;

export function NewProjectPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CollaborationProjectType>("single");
  const [visibility, setVisibility] = useState<CollaborationProjectVisibility>("members_only");
  const mutation = useMutation({
    mutationFn: () => createProject({ title, description, type, visibility }),
    onSuccess: (projectId) => {
      toast.success("Collaboration room created.");
      navigate(`/projects/${projectId}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create the project."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="New collaboration room"
        title="Give the music a room."
        description="The project stays separate from public posts until you deliberately connect or publish it."
        actions={
          <Link to="/projects">
            <Button variant="secondary"><ArrowLeft className="size-4" />Back</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-medium">Project title</span>
              <Input value={title} onChange={(event) => setTitle(event.currentTarget.value)} maxLength={160} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Working note</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={5}
                placeholder="What are we making, and what should everyone hear first?"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Room visibility</span>
              <Select value={visibility} onChange={(event) => setVisibility(event.currentTarget.value as CollaborationProjectVisibility)}>
                <option value="private">Private to you</option>
                <option value="members_only">Accepted members</option>
                <option value="link_invite">Members and invite links</option>
              </Select>
            </label>
          </div>
        </Card>

        <div className="space-y-3">
          {projectTypes.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "w-full rounded-[26px] border p-5 text-left transition-colors",
                  type === option.value
                    ? "border-accent/45 bg-accent/12"
                    : "border-border bg-surface/70 hover:border-border-strong",
                )}
                onClick={() => setType(option.value)}
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-11 items-center justify-center rounded-[16px] bg-accent/12 text-accent-secondary">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}>
          {mutation.isPending ? "Opening room…" : "Create project"}
        </Button>
      </div>
    </div>
  );
}

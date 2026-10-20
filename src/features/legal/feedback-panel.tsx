import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bug, CheckCircle2, ImagePlus, MessageSquareText, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OperatorContact } from "@/components/layout/operator-contact";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCloudUploadProvider } from "@/features/cloud-providers/use-cloud-upload-provider";
import {
  submitAppFeedback,
  validateAppFeedback,
  type AppFeedbackKind,
  type AppFeedbackValidationErrors,
} from "@/features/legal/feedback-api";
import { useAuth } from "@/hooks/use-auth";

const appAreas = [
  "Home feed",
  "Explore and search",
  "Public profile",
  "Library and song workspace",
  "Create a release",
  "Release page and sharing",
  "Player and playback queue",
  "Mobile player / installed app",
  "Projects and collaboration",
  "Direct messages",
  "Notifications",
  "Settings overview",
  "Profile settings",
  "Storage settings",
  "Appearance settings",
  "Privacy and account settings",
  "Other",
];

function getClientContext() {
  return {
    app_url: window.location.origin,
    browser_language: navigator.language,
    user_agent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    installed_app: window.matchMedia("(display-mode: standalone)").matches,
  };
}

export function FeedbackPanel() {
  const { user } = useAuth();
  const screenshotInputId = useId();
  const [kind, setKind] = useState<AppFeedbackKind>("bug");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [pageContext, setPageContext] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<AppFeedbackValidationErrors>({});
  const { connection, provider, providerId, ensureFolders } = useCloudUploadProvider(user?.id ?? null);

  const submissionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in before submitting feedback.");

      const validationErrors = validateAppFeedback({
        subject,
        details,
        pageContext,
        screenshot,
      });
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length) {
        throw new Error("Please correct the highlighted feedback fields.");
      }

      let screenshotUrl: string | null = null;
      if (screenshot) {
        if (!connection) {
          setErrors((current) => ({
            ...current,
            screenshot: "Connect a cloud provider before attaching a screenshot, or choose an affected area instead.",
          }));
          throw new Error("A connected cloud provider is required for screenshot uploads.");
        }
        const folders = await ensureFolders();
        const safeName = screenshot.name.replace(/[^a-z0-9._-]+/gi, "-");
        const upload = await provider.uploadFile({
          file: screenshot,
          filename: `feedback-${Date.now()}-${safeName}`,
          parentFolderId: folders.exportsFolderId,
        });
        const publicScreenshot = await provider.createPublicPreview(upload.fileId);
        screenshotUrl = publicScreenshot.shareUrl ?? publicScreenshot.viewUrl;
        if (!screenshotUrl?.startsWith("https://")) {
          throw new Error(`${providerId.replace("_", " ")} did not return a shareable screenshot link.`);
        }
      }

      return submitAppFeedback({
        kind,
        subject,
        details,
        pageContext: pageContext || null,
        screenshotUrl,
        clientContext: getClientContext(),
      });
    },
    onSuccess: () => {
      setKind("bug");
      setSubject("");
      setDetails("");
      setPageContext("");
      setScreenshot(null);
      setErrors({});
      toast.success("Your report was added to the MxTrove feedback inbox. Thank you.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Could not submit feedback.";
      if (message !== "Please correct the highlighted feedback fields.") {
        toast.error(message);
      }
    },
  });

  if (!user) {
    return (
      <Card className="relative overflow-hidden rounded-[30px] border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),0.2),transparent_42%),rgba(255,255,255,0.02)]">
        <div className="max-w-2xl">
          <MessageSquareText className="size-8 text-accent-secondary" />
          <CardTitle className="mt-5 text-3xl">Help shape MxTrove</CardTitle>
          <CardDescription className="mt-3 text-base leading-7">
            Sign in to submit a reproducible bug report, product feedback, or a feature idea directly to the private moderation inbox.
          </CardDescription>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Sign in to send feedback</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[30px]">
      <CardHeader>
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-accent-secondary">
              <Bug className="size-5" />
            </div>
            <CardTitle>Bug reports and feedback</CardTitle>
          </div>
          <CardDescription className="mt-3 max-w-3xl text-base leading-7">
            Tell WLKNBRCH what happened and where. A selected screenshot is uploaded to your own cloud provider and its
            share link is attached to the private report.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Type</span>
          <Select value={kind} onChange={(event) => setKind(event.currentTarget.value as AppFeedbackKind)}>
            <option value="bug">Bug report</option>
            <option value="feedback">General feedback</option>
            <option value="feature_request">Feature idea</option>
          </Select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Affected area</span>
          <Select
            value={pageContext}
            aria-invalid={Boolean(errors.context)}
            onChange={(event) => {
              setPageContext(event.currentTarget.value);
              setErrors((current) => ({ ...current, context: undefined }));
            }}
          >
            <option value="">Choose an area (optional with screenshot)</option>
            {appAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </Select>
        </label>
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium">Subject</span>
          <Input
            value={subject}
            maxLength={120}
            aria-invalid={Boolean(errors.subject)}
            placeholder="A short description of the problem or idea"
            onChange={(event) => {
              setSubject(event.currentTarget.value);
              setErrors((current) => ({ ...current, subject: undefined }));
            }}
          />
          {errors.subject ? <p role="alert" className="text-sm text-warning">{errors.subject}</p> : null}
        </label>
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium">What happened?</span>
          <Textarea
            value={details}
            maxLength={5000}
            aria-invalid={Boolean(errors.details)}
            className="min-h-40"
            placeholder="What did you do, what did you expect, and what happened instead?"
            onChange={(event) => {
              setDetails(event.currentTarget.value);
              setErrors((current) => ({ ...current, details: undefined }));
            }}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{errors.details ?? "Include steps that make the issue reproducible."}</span>
            <span>{details.length}/5000</span>
          </div>
        </label>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium">Optional screenshot</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              PNG, JPEG, or WebP up to 5 MB. {connection ? `Upload via ${providerId.replace("_", " ")}.` : "Connect storage first to attach one."}
              {" "}Anyone with the generated link may be able to open the image, so avoid sensitive information.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <input
              id={screenshotInputId}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                setScreenshot(event.currentTarget.files?.[0] ?? null);
                setErrors((current) => ({ ...current, screenshot: undefined, context: undefined }));
                event.currentTarget.value = "";
              }}
            />
            <label htmlFor={screenshotInputId} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-white/[0.03] px-4 text-sm font-medium transition-colors hover:bg-white/[0.06]">
              <ImagePlus className="size-4" />
              Choose screenshot
            </label>
            {screenshot ? (
              <Button variant="ghost" size="sm" onClick={() => setScreenshot(null)}>
                <X className="size-4" /> Remove
              </Button>
            ) : null}
          </div>
        </div>
        {screenshot ? (
          <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="truncate">{screenshot.name}</span>
          </p>
        ) : null}
        {errors.screenshot ? <p role="alert" className="mt-3 text-sm text-warning">{errors.screenshot}</p> : null}
        {errors.context ? <p role="alert" className="mt-3 text-sm text-warning">{errors.context}</p> : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-muted-foreground">
          Browser, viewport, and app-mode details are included automatically. For urgent matters: {" "}
          <OperatorContact className="text-accent-secondary underline-offset-4 hover:underline" />
        </p>
        <Button
          className="shrink-0"
          disabled={submissionMutation.isPending}
          onClick={() => submissionMutation.mutate()}
        >
          <Send className="size-4" />
          {submissionMutation.isPending ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </Card>
  );
}

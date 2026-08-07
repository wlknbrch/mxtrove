import { createDemoDelay, isDemoModeEnabled, requireSupabase } from "@/lib/service-utils";

export type AppFeedbackKind = "bug" | "feedback" | "feature_request";

export interface AppFeedbackInput {
  kind: AppFeedbackKind;
  subject: string;
  details: string;
  pageContext: string | null;
  screenshotUrl: string | null;
  clientContext: Record<string, string | number | boolean | null>;
}

export interface AppFeedbackValidationErrors {
  subject?: string;
  details?: string;
  context?: string;
  screenshot?: string;
}

export function validateAppFeedback(input: {
  subject: string;
  details: string;
  pageContext: string;
  screenshot: File | null;
}) {
  const errors: AppFeedbackValidationErrors = {};
  const subjectLength = input.subject.trim().length;
  const detailsLength = input.details.trim().length;

  if (subjectLength < 3 || subjectLength > 120) {
    errors.subject = "Use a subject between 3 and 120 characters.";
  }
  if (detailsLength < 20 || detailsLength > 5000) {
    errors.details = "Describe what happened in 20 to 5,000 characters.";
  }
  if (!input.pageContext && !input.screenshot) {
    errors.context = "Choose the affected area or attach a screenshot so the issue can be reproduced.";
  }
  if (input.screenshot) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(input.screenshot.type)) {
      errors.screenshot = "Use a PNG, JPEG, or WebP screenshot.";
    } else if (input.screenshot.size > 5 * 1024 * 1024) {
      errors.screenshot = "The screenshot must be 5 MB or smaller.";
    }
  }

  return errors;
}

export async function submitAppFeedback(input: AppFeedbackInput) {
  if (isDemoModeEnabled()) {
    await createDemoDelay(180);
    return crypto.randomUUID();
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("submit_app_feedback", {
    feedback_kind: input.kind,
    feedback_subject: input.subject.trim(),
    feedback_details: input.details.trim(),
    affected_page: input.pageContext,
    screenshot_url: input.screenshotUrl,
    browser_context: input.clientContext,
  });
  if (error) throw error;
  return data as string;
}

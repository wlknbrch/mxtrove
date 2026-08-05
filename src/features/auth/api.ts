import { requireSupabase } from "@/lib/service-utils";
import {
  clearPendingTermsAcceptance,
  CURRENT_TERMS_VERSION,
  rememberPendingTermsAcceptance,
} from "@/features/legal/terms";

function buildAuthRedirectUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

export async function signInWithPassword(input: { email: string; password: string }) {
  clearPendingTermsAcceptance();
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword(input);

  if (error) {
    clearPendingTermsAcceptance();
    throw error;
  }
}

export async function signInWithGoogle(options?: { termsAccepted?: boolean }) {
  if (options?.termsAccepted) {
    rememberPendingTermsAcceptance();
  }

  const client = requireSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthRedirectUrl("/"),
    },
  });

  if (error) {
    clearPendingTermsAcceptance();
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthRedirectUrl("/reset-password"),
  });

  if (error) {
    throw error;
  }
}

export async function updateRecoveredPassword(password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
  termsAccepted: boolean;
}) {
  clearPendingTermsAcceptance();
  if (!input.termsAccepted) {
    throw new Error("Accept the Terms of Service before creating an account.");
  }

  const client = requireSupabase();
  const { error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName,
        terms_accepted_version: CURRENT_TERMS_VERSION,
      },
    },
  });

  if (error) {
    throw error;
  }
}

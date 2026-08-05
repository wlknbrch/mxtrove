import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/service-utils", () => ({
  requireSupabase: () => ({ auth: authMocks }),
}));

import {
  requestPasswordReset,
  signInWithGoogle,
  signUpWithPassword,
  updateRecoveredPassword,
} from "@/features/auth/api";

describe("authentication API", () => {
  beforeEach(() => {
    authMocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
    authMocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    authMocks.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
    authMocks.signUp.mockReset().mockResolvedValue({ error: null });
    authMocks.updateUser.mockReset().mockResolvedValue({ error: null });
    window.sessionStorage.clear();
  });

  it("remembers consent while a Google registration leaves for OAuth", async () => {
    await signInWithGoogle({ termsAccepted: true });

    expect(window.sessionStorage.getItem("mxtrove:pending-terms-acceptance")).toContain("2026-08-05");
  });

  it("includes the current Terms version in password registration metadata", async () => {
    await signUpWithPassword({
      email: "listener@example.com",
      password: "a-secure-password",
      displayName: "Listener",
      termsAccepted: true,
    });

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "listener@example.com",
      password: "a-secure-password",
      options: {
        data: {
          display_name: "Listener",
          terms_accepted_version: "2026-08-05",
        },
      },
    });
  });

  it("refuses password registration without Terms acceptance", async () => {
    await expect(signUpWithPassword({
      email: "listener@example.com",
      password: "a-secure-password",
      termsAccepted: false,
    })).rejects.toThrow("Accept the Terms of Service");
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("starts Google OAuth through Supabase and returns to the app", async () => {
    await signInWithGoogle();

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: new URL("/", window.location.origin).toString(),
      },
    });
  });

  it("sends recovery links back to the password reset screen", async () => {
    await requestPasswordReset("listener@example.com");

    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "listener@example.com",
      {
        redirectTo: new URL("/reset-password", window.location.origin).toString(),
      },
    );
  });

  it("updates the recovered account password through the active recovery session", async () => {
    await updateRecoveredPassword("a-secure-new-password");

    expect(authMocks.updateUser).toHaveBeenCalledWith({
      password: "a-secure-new-password",
    });
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppearanceProvider,
  useAppearance,
} from "@/features/appearance/appearance-provider";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null }),
}));

function AppearanceProbe() {
  const { settings, updateSettings } = useAppearance();
  return (
    <div>
      <output>{`${settings.theme}:${settings.accent}:${settings.interface_density}`}</output>
      <button
        type="button"
        onClick={() =>
          void updateSettings({
            ...settings,
            theme: "light",
            accent: "emerald",
            interface_density: "compact",
          })
        }
      >
        Apply
      </button>
    </div>
  );
}

describe("AppearanceProvider", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.accent;
    delete document.documentElement.dataset.density;
  });

  it("restores pre-login appearance without a wrong-theme flash", () => {
    window.localStorage.setItem(
      "mxshare:appearance:v2",
      JSON.stringify({
        theme: "light",
        accent: "cyan",
        interface_density: "compact",
      }),
    );

    render(
      <AppearanceProvider>
        <AppearanceProbe />
      </AppearanceProvider>,
    );

    expect(screen.getByText("light:cyan:compact")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.accent).toBe("cyan");
    expect(document.documentElement.dataset.density).toBe("compact");
  });

  it("persists local changes and applies their CSS datasets", async () => {
    const user = userEvent.setup();
    render(
      <AppearanceProvider>
        <AppearanceProbe />
      </AppearanceProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("light:emerald:compact")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.accent).toBe("emerald");
    expect(document.documentElement.dataset.density).toBe("compact");
    expect(
      JSON.parse(window.localStorage.getItem("mxshare:appearance:v2") ?? "{}"),
    ).toMatchObject({
      theme: "light",
      accent: "emerald",
      interface_density: "compact",
    });
  });
});

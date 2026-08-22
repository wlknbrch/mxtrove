import { describe, expect, it } from "vitest";

import packageJson from "../../../package.json";
import { appReleases, getArchivedAppReleases, getCurrentAppRelease } from "@/features/legal/changelog";

describe("app changelog", () => {
  it("has a release entry for the package version", () => {
    expect(appReleases.some((release) => release.version === packageJson.version)).toBe(true);
    expect(getCurrentAppRelease(packageJson.version).version).toBe(packageJson.version);
  });

  it("keeps the current release out of the archive", () => {
    expect(getArchivedAppReleases(packageJson.version)).not.toContainEqual(
      expect.objectContaining({ version: packageJson.version }),
    );
  });
});

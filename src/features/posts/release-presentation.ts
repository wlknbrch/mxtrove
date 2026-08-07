export const releaseCreditRoles = [
  "artist",
  "featured_artist",
  "producer",
  "composer",
  "lyricist",
  "vocalist",
  "instrumentalist",
  "mix_engineer",
  "mastering_engineer",
  "artwork",
  "other",
] as const;

export const releaseLinkPlatforms = [
  "spotify",
  "apple_music",
  "youtube",
  "bandcamp",
  "soundcloud",
  "website",
  "download",
  "other",
] as const;

export type ReleasePresentationField = "title" | "releaseUrl" | "credits" | "externalLinks";

export class ReleasePresentationValidationError extends Error {
  constructor(
    public readonly field: ReleasePresentationField,
    message: string,
  ) {
    super(message);
    this.name = "ReleasePresentationValidationError";
  }
}

function normalizeOption(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function validateReleaseTitle(title: string) {
  const length = title.trim().length;
  if (length < 1 || length > 160) {
    throw new ReleasePresentationValidationError(
      "title",
      "Enter a release title between 1 and 160 characters.",
    );
  }
  return title.trim();
}

export function validateOptionalHttpsUrl(value: string, field: ReleasePresentationField = "releaseUrl") {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ReleasePresentationValidationError(field, "Enter a complete URL such as https://example.com.");
  }
  if (parsed.protocol !== "https:") {
    throw new ReleasePresentationValidationError(field, "External links must start with https://.");
  }
  return parsed.toString();
}

export function parseReleaseCredits(value: string) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 40) {
    throw new ReleasePresentationValidationError("credits", "Add no more than 40 credit lines.");
  }

  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length > 2) {
      throw new ReleasePresentationValidationError(
        "credits",
        `Credit line ${index + 1} has too many separators. Use Name | role.`,
      );
    }
    const displayName = parts[0] ?? "";
    if (!displayName || displayName.length > 120) {
      throw new ReleasePresentationValidationError(
        "credits",
        `Credit line ${index + 1} needs a name between 1 and 120 characters.`,
      );
    }
    const role = normalizeOption(parts[1] || "other");
    if (!(releaseCreditRoles as readonly string[]).includes(role)) {
      throw new ReleasePresentationValidationError(
        "credits",
        `Credit line ${index + 1} uses an unknown role "${parts[1]}". Use ${releaseCreditRoles.join(", ")}.`,
      );
    }
    return {
      profile_id: null,
      display_name: displayName,
      role,
      position: index + 1,
    };
  });
}

export function parseReleaseExternalLinks(value: string) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 20) {
    throw new ReleasePresentationValidationError("externalLinks", "Add no more than 20 external-link lines.");
  }

  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length > 3) {
      throw new ReleasePresentationValidationError(
        "externalLinks",
        `Link line ${index + 1} has too many separators. Use Label | https://URL | platform.`,
      );
    }

    const rawUrl = parts.length === 1 ? parts[0] : parts[1];
    let url: string;
    try {
      url = validateOptionalHttpsUrl(rawUrl ?? "", "externalLinks") ?? "";
    } catch (error) {
      if (error instanceof ReleasePresentationValidationError) {
        throw new ReleasePresentationValidationError(
          "externalLinks",
          `Link line ${index + 1}: ${error.message}`,
        );
      }
      throw error;
    }
    if (!url) {
      throw new ReleasePresentationValidationError(
        "externalLinks",
        `Link line ${index + 1} needs a URL. Use Label | https://URL | platform.`,
      );
    }

    const label = (parts.length === 1 ? "Release link" : parts[0]) || "Release link";
    if (label.length > 120) {
      throw new ReleasePresentationValidationError(
        "externalLinks",
        `Link line ${index + 1} uses a label longer than 120 characters.`,
      );
    }
    const platform = normalizeOption(parts[2] || "other");
    if (!(releaseLinkPlatforms as readonly string[]).includes(platform)) {
      throw new ReleasePresentationValidationError(
        "externalLinks",
        `Link line ${index + 1} uses an unknown platform "${parts[2]}". Use ${releaseLinkPlatforms.join(", ")}.`,
      );
    }
    return {
      label,
      url,
      platform,
      position: index + 1,
    };
  });
}

export function mergePrimaryReleaseUrl(
  releaseUrl: string | undefined,
  links: ReturnType<typeof parseReleaseExternalLinks>,
) {
  if (!releaseUrl) return links;

  const matchingLink = links.find((link) => link.url === releaseUrl);
  const remainingLinks = links.filter((link) => link !== matchingLink);
  if (!matchingLink && links.length >= 20) {
    throw new ReleasePresentationValidationError(
      "externalLinks",
      "The external release URL would create a 21st link. Remove one external link first.",
    );
  }

  return [
    matchingLink ?? {
      label: "Release link",
      url: releaseUrl,
      platform: "other",
      position: 1,
    },
    ...remainingLinks,
  ].map((link, index) => ({ ...link, position: index + 1 }));
}

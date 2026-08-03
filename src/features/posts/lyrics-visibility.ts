export function getVisiblePostLyrics(input: {
  lyrics: string | null | undefined;
  showLyrics: boolean;
  ownerId: string;
  viewerId?: string | null;
}) {
  const lyrics = input.lyrics?.trim();
  if (!lyrics) {
    return null;
  }

  return input.showLyrics || input.viewerId === input.ownerId ? lyrics : null;
}

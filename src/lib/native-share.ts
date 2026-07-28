export interface ShareRequest {
  title: string;
  text?: string;
  url: string;
}

export type ShareResult = "shared" | "copied" | "cancelled";

export async function shareWithSystemDialog(request: ShareRequest): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(request);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  await navigator.clipboard.writeText(request.url);
  return "copied";
}

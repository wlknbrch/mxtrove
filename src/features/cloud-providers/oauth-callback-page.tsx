import { useEffect } from "react";
import { useParams } from "react-router-dom";

export function OAuthCallbackPage() {
  const { provider = "" } = useParams();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    window.opener?.postMessage(
      {
        type: "mxshare:oauth",
        provider,
        code: query.get("code"),
        state: query.get("state"),
        error: query.get("error_description") ?? query.get("error"),
      },
      window.location.origin,
    );
    window.close();
  }, [provider]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <p className="font-display text-3xl">Connecting storage…</p>
        <p className="mt-3 text-sm text-muted-foreground">This window closes automatically.</p>
      </div>
    </div>
  );
}

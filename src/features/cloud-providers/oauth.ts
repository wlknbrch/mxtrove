import type { CloudProvider } from "@/types/domain";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createPkcePair() {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return {
    verifier,
    challenge: toBase64Url(new Uint8Array(digest)),
  };
}

export function getProviderRedirectUri(provider: Exclude<CloudProvider, "google_drive">) {
  return `${window.location.origin}/oauth/callback/${provider}`;
}

export function openProviderOAuthPopup(input: {
  provider: Exclude<CloudProvider, "google_drive">;
  authorizationUrl: string;
  state: string;
}) {
  return new Promise<string>((resolve, reject) => {
    const popup = window.open(
      input.authorizationUrl,
      `mxshare-${input.provider}-oauth`,
      "popup=yes,width=620,height=760",
    );
    if (!popup) {
      reject(new Error("The OAuth popup was blocked by the browser."));
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      popup.close();
      reject(new Error("The cloud provider connection timed out."));
    }, 5 * 60 * 1000);

    const poll = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("The cloud provider connection was cancelled."));
      }
    }, 500);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as {
        type?: string;
        provider?: string;
        state?: string;
        code?: string;
        error?: string;
      };
      if (payload.type !== "mxshare:oauth" || payload.provider !== input.provider) return;
      if (payload.state !== input.state) {
        cleanup();
        reject(new Error("The OAuth state check failed."));
        return;
      }
      cleanup();
      popup.close();
      if (payload.error || !payload.code) {
        reject(new Error(payload.error || "The provider did not return an authorization code."));
        return;
      }
      resolve(payload.code);
    };

    function cleanup() {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
    }

    window.addEventListener("message", onMessage);
  });
}

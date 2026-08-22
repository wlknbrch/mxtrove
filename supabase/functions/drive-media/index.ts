import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers":
    "accept-ranges, cache-control, content-length, content-range, content-type, etag, last-modified",
};

function jsonResponse(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getDropboxProxyUrl(value: string | null) {
  if (!value) {
    return null;
  }
  const url = new URL(value);
  if (
    url.hostname !== "dropbox.com"
    && !url.hostname.endsWith(".dropbox.com")
    && !url.hostname.endsWith(".dropboxusercontent.com")
  ) {
    return null;
  }
  return url.toString();
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim();
  const kind = url.searchParams.get("kind") === "audio" ? "audio" : "image";
  const provider = url.searchParams.get("provider");
  const dropboxUrl = provider === "dropbox"
    ? getDropboxProxyUrl(url.searchParams.get("url"))
    : null;

  if (!fileId && !dropboxUrl) {
    return jsonResponse(400, { error: "Missing or unsupported media source." });
  }

  const proxyBaseUrl = Deno.env.get("PUBLIC_MEDIA_PROXY_URL")
    || "https://mxtrove.wlknbrch.com/worker/v1/public-media";
  const redirectUrl = new URL(proxyBaseUrl);
  for (const [key, value] of url.searchParams.entries()) {
    redirectUrl.searchParams.set(key, value);
  }
  redirectUrl.searchParams.set("kind", kind);

  return new Response(null, {
    status: 307,
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600",
      Location: redirectUrl.toString(),
    },
  });
});

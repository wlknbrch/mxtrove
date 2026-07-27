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

function buildDriveProxyUrl(fileId: string, kind: "audio" | "image", size: string | null) {
  const encodedFileId = encodeURIComponent(fileId);

  if (kind === "image") {
    const requestedSize = size?.trim() || "w1200";
    return `https://drive.google.com/thumbnail?id=${encodedFileId}&sz=${encodeURIComponent(requestedSize)}`;
  }

  return `https://drive.google.com/uc?export=download&id=${encodedFileId}`;
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

function copyProxyHeaders(source: Headers) {
  const headers = new Headers(corsHeaders);
  const headerNames = [
    "accept-ranges",
    "cache-control",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ];

  for (const headerName of headerNames) {
    const headerValue = source.get(headerName);
    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
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
  const size = url.searchParams.get("size");
  const provider = url.searchParams.get("provider");
  const dropboxUrl = provider === "dropbox"
    ? getDropboxProxyUrl(url.searchParams.get("url"))
    : null;

  if (!fileId && !dropboxUrl) {
    return jsonResponse(400, { error: "Missing or unsupported media source." });
  }

  const upstreamHeaders = new Headers();
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    upstreamHeaders.set("Range", rangeHeader);
  }

  const upstreamResponse = await fetch(
    dropboxUrl ?? buildDriveProxyUrl(fileId!, kind, size),
    {
    method: request.method,
    headers: upstreamHeaders,
    redirect: "follow",
    },
  );
  const responseHeaders = copyProxyHeaders(upstreamResponse.headers);
  if (dropboxUrl) {
    responseHeaders.set(
      "content-type",
      kind === "audio" ? "audio/mpeg" : upstreamResponse.headers.get("content-type") ?? "image/jpeg",
    );
  }

  return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
});

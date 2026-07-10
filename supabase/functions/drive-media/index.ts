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

  if (!fileId) {
    return jsonResponse(400, { error: "Missing fileId query parameter." });
  }

  const upstreamHeaders = new Headers();
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    upstreamHeaders.set("Range", rangeHeader);
  }

  const upstreamResponse = await fetch(buildDriveProxyUrl(fileId, kind, size), {
    method: request.method,
    headers: upstreamHeaders,
    redirect: "follow",
  });

  return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: copyProxyHeaders(upstreamResponse.headers),
  });
});

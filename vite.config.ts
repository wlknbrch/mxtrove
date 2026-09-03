import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

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

function copyProxyHeaders(response: Response, target: import("node:http").ServerResponse) {
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
    const headerValue = response.headers.get(headerName);
    if (headerValue) {
      target.setHeader(headerName, headerValue);
    }
  }
}

function driveMediaProxyPlugin() {
  return {
    name: "mxshare-drive-media-proxy",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/drive-media", async (request, response, next) => {
        const abortController = new AbortController();
        const abortUpstream = () => abortController.abort();
        request.once("aborted", abortUpstream);
        response.once("close", abortUpstream);
        try {
          if (!request.url) {
            next();
            return;
          }

          const url = new URL(request.url, "http://localhost");
          const fileId = url.searchParams.get("fileId")?.trim();
          const kind = url.searchParams.get("kind") === "audio" ? "audio" : "image";
          const size = url.searchParams.get("size");
          const provider = url.searchParams.get("provider");
          const dropboxUrl = provider === "dropbox"
            ? getDropboxProxyUrl(url.searchParams.get("url"))
            : null;

          if (!fileId && !dropboxUrl) {
            response.statusCode = 400;
            response.setHeader("content-type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "Missing or unsupported media source." }));
            return;
          }

          const headers = new Headers();
          const rangeHeader = request.headers.range;

          if (rangeHeader) {
            headers.set("Range", rangeHeader);
          }

          const upstreamResponse = await fetch(
            dropboxUrl ?? buildDriveProxyUrl(fileId!, kind, size),
            {
              headers,
              redirect: "follow",
              signal: abortController.signal,
            },
          );

          response.statusCode = upstreamResponse.status;
          copyProxyHeaders(upstreamResponse, response);
          if (dropboxUrl) {
            response.setHeader(
              "content-type",
              kind === "audio" ? "audio/mpeg" : upstreamResponse.headers.get("content-type") ?? "image/jpeg",
            );
          }

          if (!upstreamResponse.body) {
            response.end(await upstreamResponse.text());
            return;
          }

          await pipeline(
            Readable.fromWeb(upstreamResponse.body as import("node:stream/web").ReadableStream),
            response,
          );
        } catch (error) {
          const disconnected = request.destroyed || response.destroyed || abortController.signal.aborted;
          if (disconnected) return;
          if (!response.headersSent) {
            response.statusCode = 502;
            response.setHeader("content-type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "The connected cloud provider interrupted the media transfer." }));
            return;
          }
          response.destroy(error instanceof Error ? error : undefined);
        } finally {
          request.removeListener("aborted", abortUpstream);
          response.removeListener("close", abortUpstream);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [driveMediaProxyPlugin(), react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: /^react$/,
        replacement: path.resolve(__dirname, "./node_modules/react/index.js"),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
      },
      {
        find: /^react-dom$/,
        replacement: path.resolve(__dirname, "./node_modules/react-dom/index.js"),
      },
      {
        find: /^react-dom\/client$/,
        replacement: path.resolve(__dirname, "./node_modules/react-dom/client.js"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }

          if (id.includes("react-router")) {
            return "router-vendor";
          }

          if (id.includes("@supabase")) {
            return "supabase-vendor";
          }

          if (id.includes("@tanstack")) {
            return "query-vendor";
          }

          if (id.includes("@dnd-kit")) {
            return "dnd-vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }
        },
      },
    },
  },
});

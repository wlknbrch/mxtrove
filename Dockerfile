FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
COPY services/media-worker/src/public-media/upstream.ts ./services/media-worker/src/public-media/upstream.ts
COPY scripts/copy-license-notices.mjs ./scripts/copy-license-notices.mjs
COPY LICENSE NOTICE THIRD_PARTY_NOTICES.md ./

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_GOOGLE_DRIVE_CLIENT_ID
ARG VITE_DROPBOX_CLIENT_ID
ARG VITE_ONEDRIVE_CLIENT_ID
ARG VITE_MEDIA_WORKER_URL
ARG VITE_WEB_PUSH_PUBLIC_KEY
ARG VITE_PWA_ENABLED=true
ARG VITE_ENABLE_DEMO_MODE=false
ARG VITE_APP_URL
ARG VITE_SOURCE_URL=https://github.com/wlknbrch/mxtrove
ARG VITE_OPERATOR_NAME
ARG VITE_CONTACT_EMAIL

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_GOOGLE_DRIVE_CLIENT_ID=${VITE_GOOGLE_DRIVE_CLIENT_ID}
ENV VITE_DROPBOX_CLIENT_ID=${VITE_DROPBOX_CLIENT_ID}
ENV VITE_ONEDRIVE_CLIENT_ID=${VITE_ONEDRIVE_CLIENT_ID}
ENV VITE_MEDIA_WORKER_URL=${VITE_MEDIA_WORKER_URL}
ENV VITE_WEB_PUSH_PUBLIC_KEY=${VITE_WEB_PUSH_PUBLIC_KEY}
ENV VITE_PWA_ENABLED=${VITE_PWA_ENABLED}
ENV VITE_ENABLE_DEMO_MODE=${VITE_ENABLE_DEMO_MODE}
ENV VITE_APP_URL=${VITE_APP_URL}
ENV VITE_SOURCE_URL=${VITE_SOURCE_URL}
ENV VITE_OPERATOR_NAME=${VITE_OPERATOR_NAME}
ENV VITE_CONTACT_EMAIL=${VITE_CONTACT_EMAIL}

RUN test -n "${VITE_SUPABASE_URL}" \
  && test -n "${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  && test -n "${VITE_MEDIA_WORKER_URL}" \
  && test -n "${VITE_APP_URL}"

RUN npm run build

FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="MxTrove" \
  org.opencontainers.image.licenses="AGPL-3.0-only" \
  org.opencontainers.image.source="https://github.com/wlknbrch/mxtrove"

COPY LICENSE NOTICE THIRD_PARTY_NOTICES.md /usr/share/nginx/html/licenses/

COPY deploy/nginx/mxshare.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]

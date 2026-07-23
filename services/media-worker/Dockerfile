FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/media-worker/package.json services/media-worker/package-lock.json ./
RUN npm ci

COPY services/media-worker/tsconfig.json ./tsconfig.json
COPY services/media-worker/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/media-worker/package.json services/media-worker/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
ENV MEDIA_TEMP_DIR=/tmp/mxshare
ENV PROTECTED_MEDIA_DIR=/data/mxshare-protected-media

EXPOSE 8080

CMD ["node", "dist/server.js"]

# syntax=docker/dockerfile:1

########################################
# Stage 1 — build the Vite app
########################################
FROM oven/bun:1-alpine AS build

WORKDIR /app

# VITE_CONVEX_URL is inlined into the bundle at build time. `.dockerignore`
# excludes every .env file, so this build arg is the only way in, and the
# bundle is worthless without it — validate before doing any work.
#
#   docker build --build-arg VITE_CONVEX_URL=https://<deployment>.convex.cloud .
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=${VITE_CONVEX_URL}

RUN case "${VITE_CONVEX_URL}" in \
      http://*|https://*) \
        echo "VITE_CONVEX_URL=${VITE_CONVEX_URL}" ;; \
      *) \
        echo "error: the VITE_CONVEX_URL build arg is required and must be an http(s) URL" >&2; \
        echo "       e.g. docker build --build-arg VITE_CONVEX_URL=https://<deployment>.convex.cloud ." >&2; \
        exit 1 ;; \
    esac

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Skip the tsc step that `bun run build` runs: the image build only needs the
# bundle, and type errors should fail in CI rather than inside a container.
RUN bunx vite build

# The build succeeded, so the URL really is inlined. Assert it here: this is
# the exact class of mistake that previously shipped a bundle pointing at
# `undefined` and a blank page in production.
RUN if ! grep -rqF "${VITE_CONVEX_URL}" /app/dist/assets; then \
      echo "error: VITE_CONVEX_URL (${VITE_CONVEX_URL}) was not inlined into the bundle" >&2; \
      exit 1; \
    fi

########################################
# Stage 2 — runtime
########################################
# denoland/deno:alpine is small and already has the runtime that main.ts needs;
# the Cloud Run runtime contract is just "listen on $PORT".
FROM denoland/deno:alpine

WORKDIR /app

# main.ts imports Hono from a deno.land URL, so Deno caches it on first run.
# This happens at build time so the first cold start isn't paying for it.
COPY main.ts ./
RUN deno cache main.ts

COPY --from=build /app/dist ./dist

# Cloud Run sets $PORT (default 8080) and requires binding 0.0.0.0.
ENV PORT=8080
ENV DENO_NO_UPDATE_CHECK=1
EXPOSE 8080

# Run unprivileged; the deno image ships a `deno` user for exactly this.
USER deno

# Liveness probe target. Cloud Run only uses this for startup probes and
# uptime checks, but it fails fast if the static root is missing.
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "--no-lock", "main.ts"]

#!/usr/bin/env bash
#
# Build the VerveFit image and deploy it to Cloud Run.
#
#   ./deploy/cloudrun.sh                       # deploy (uses defaults below)
#   SERVICE=vervefit-api REGION=europe-west1 ./deploy/cloudrun.sh
#
# Authenticate once beforehand with:
#   gcloud auth login && gcloud auth application-default login
set -euo pipefail

# --- Config (override any of these via the environment) -------------------
SERVICE="${SERVICE:-vervefit-web}"
REGION="${REGION:-us-central1}"
REPO="${REPO:-vervefit}"
# Cloud Run resolves the image as REGION-docker.pkg.dev/PROJECT/REPO/SERVICE.
# PROJECT is normally set by gcloud; fall back to the active gcloud config.
PROJECT="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
  echo "error: set GOOGLE_CLOUD_PROJECT or run 'gcloud config set project <id>'" >&2
  exit 1
fi

# Artifact Registry hosts images under the region they were created in, so
# the registry host must use REGION (a hardcoded us-docker.pkg.dev silently
# 404s the push whenever REGION is anything else).
REGISTRY="${REGISTRY:-${REGION}-docker.pkg.dev}"
IMAGE="${REGISTRY}/${PROJECT}/${REPO}/${SERVICE}:$(date +%Y%m%d-%H%M%S)"

# The Vite bundle inlines this at build time, so the build arg is required.
# Trailing slashes and whitespace produce a URL that Convex rejects at runtime
# while still looking valid, so normalise and validate it here.
if [[ -z "${VITE_CONVEX_URL:-}" ]]; then
  echo "error: VITE_CONVEX_URL is not set (e.g. https://<deployment>.convex.cloud)" >&2
  exit 1
fi
VITE_CONVEX_URL="${VITE_CONVEX_URL%/}"
if [[ ! "${VITE_CONVEX_URL}" =~ ^https?://[^[:space:]]+$ ]]; then
  echo "error: VITE_CONVEX_URL must be an http(s) URL, got '${VITE_CONVEX_URL}'" >&2
  exit 1
fi

echo "==> Project : ${PROJECT}"
echo "==> Region  : ${REGION}"
echo "==> Image   : ${IMAGE}"
echo "==> Convex  : ${VITE_CONVEX_URL}"

# --- Enable APIs ----------------------------------------------------------
# Cloud Run, Artifact Registry and Cloud Build are all needed on first run.
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project "${PROJECT}" >/dev/null

# --- Ensure the Artifact Registry repo exists -----------------------------
if ! gcloud artifacts repositories describe "${REPO}" \
  --location="${REGION}" --project="${PROJECT}" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repo '${REPO}'"
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="VerveFit images" \
    --project="${PROJECT}"
fi

# --- Build ----------------------------------------------------------------
echo "==> Building image"
docker build \
  --build-arg VITE_CONVEX_URL="${VITE_CONVEX_URL}" \
  -t "${IMAGE}" \
  .

# Belt and braces: the Dockerfile already fails the build without a Convex URL,
# but a green build that cannot reach Convex is worse than a red one.
echo "==> Verifying the bundle carries the Convex URL"
docker run --rm --entrypoint sh "${IMAGE}" \
  -c "grep -rqF '${VITE_CONVEX_URL}' /app/dist/assets" \
  || { echo "error: the built image does not contain ${VITE_CONVEX_URL}" >&2; exit 1; }

echo "==> Pushing image"
docker push "${IMAGE}"

# --- Deploy ---------------------------------------------------------------
echo "==> Deploying to Cloud Run"
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --port=8080 \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --set-env-vars "PORT=8080" \
  --project="${PROJECT}"

URL="$(gcloud run services describe "${SERVICE}" \
  --region="${REGION}" --project="${PROJECT}" \
  --format='value(status.url)')"

echo
echo "==> Deployed: ${URL}"
echo "    Health check: ${URL}/healthz"

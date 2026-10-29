#!/usr/bin/env bash
# Deploy current main to Cloud Run. Run migrations first if this release has any
# (see docs/deploy.md step 5).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_ID=${PROJECT_ID:-azime-prod}
REGION=${REGION:-us-central1}
SERVICE=${SERVICE:-azime}
BUCKET=${BUCKET:-${PROJECT_ID}-records}
SQL_INSTANCE=${SQL_INSTANCE:-azime-db}
SA=azime-run@${PROJECT_ID}.iam.gserviceaccount.com

[[ $(git branch --show-current) == main ]] || { echo "Not on main"; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo "Working tree not clean"; exit 1; }
git fetch -q origin main
[[ $(git rev-parse HEAD) == $(git rev-parse origin/main) ]] || { echo "main differs from origin/main"; exit 1; }

pnpm build

COMMIT=$(git rev-parse --short HEAD)
echo "Deploying $COMMIT to $SERVICE in $PROJECT_ID"

gcloud beta run deploy "$SERVICE" --source . --project="$PROJECT_ID" --region="$REGION" \
  --service-account="$SA" \
  --add-cloudsql-instances="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}" \
  --set-secrets=DATABASE_URL=database-url:latest \
  --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},GCP_BUCKET_NAME=${BUCKET},GCP_LOCATION=global" \
  --update-labels="commit=${COMMIT}" \
  --timeout=3600 --memory=1Gi --max-instances=2 \
  --no-allow-unauthenticated --iap

# A rollback pins traffic to an old revision; send it back to the new one.
gcloud run services update-traffic "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --to-latest

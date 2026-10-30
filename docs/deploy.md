# Deploy: Cloud Run + Cloud SQL + IAP

One Cloud Run service serves both the API (`/api/*`) and the built React app.
Login is IAP (Google sign-in in front of the whole service); the app has no auth code.
Production lives in a **new project under the business Google account**. The personal
project stays as dev.

Run everything below in one terminal session so the variables carry through.
Steps 1–6 are one-time setup. Step 7 is every deploy.

## 0. Before you start (console, not gcloud)

- [ ] Sign in to https://console.cloud.google.com as the **business** account.
- [ ] Create the project (e.g. `azime-prod`) and link the business billing account.
- [ ] Accept the Google Cloud BAA (IAM & Admin → Legal & Compliance, or ask Google
      sales if it isn't offered). Do this before any real patient data is uploaded.
- [ ] Decide the iPad account. IAP's built-in login only admits accounts in the
      business's Google organization. If any user (including the iPad) is a plain
      `@gmail.com` account, IAP needs a custom OAuth client — stop and sort that first.
- [ ] Install tools: `brew install --cask google-cloud-sdk` and `brew install cloud-sql-proxy`.

## 1. Variables + project

```sh
export PROJECT_ID=azime-prod          # the project you just created
export REGION=us-central1
export SERVICE=azime
export BUCKET=${PROJECT_ID}-records
export SQL_INSTANCE=azime-db
export SA=azime-run@${PROJECT_ID}.iam.gserviceaccount.com

gcloud config configurations create azime-prod   # keeps business separate from personal
gcloud auth login                      # business account
gcloud config set project $PROJECT_ID
# back to personal dev later: gcloud config configurations activate default
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud services enable \
  run.googleapis.com sqladmin.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  aiplatform.googleapis.com iap.googleapis.com storage.googleapis.com \
  iamcredentials.googleapis.com cloudresourcemanager.googleapis.com \
  billingbudgets.googleapis.com
```

## 2. Database (Cloud SQL Postgres 16)

```sh
gcloud sql instances create $SQL_INSTANCE \
  --database-version=POSTGRES_16 --edition=ENTERPRISE --tier=db-f1-micro \
  --region=$REGION --storage-auto-increase \
  --backup-start-time=08:00 --enable-point-in-time-recovery

gcloud sql databases create azime --instance=$SQL_INSTANCE

# Password lives outside the repo; later steps `source` it
mkdir -p ~/.config/azime && chmod 700 ~/.config/azime
printf 'DB_PASS=%s\n' "$(openssl rand -hex 24)" > ~/.config/azime/prod.env
chmod 600 ~/.config/azime/prod.env
source ~/.config/azime/prod.env
gcloud sql users create azime --instance=$SQL_INSTANCE --password=$DB_PASS

# Cloud Run reaches Cloud SQL over a unix socket
printf %s "postgresql://azime:${DB_PASS}@/azime?host=/cloudsql/${PROJECT_ID}:${REGION}:${SQL_INSTANCE}" \
  | gcloud secrets create database-url --data-file=-
```

`db-f1-micro` is the cheapest tier (shared CPU, no SLA). Bump to `db-g1-small` if it feels slow.

## 3. Storage bucket

```sh
gcloud storage buckets create gs://$BUCKET --location=$REGION \
  --uniform-bucket-level-access --public-access-prevention
```

Bucket CORS is set in step 8, once the service URL exists.

## 4. Service account

```sh
gcloud iam service-accounts create azime-run --display-name="azime Cloud Run"

gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/cloudsql.client
gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/aiplatform.user
gcloud storage buckets add-iam-policy-binding gs://$BUCKET --member=serviceAccount:$SA --role=roles/storage.objectAdmin
gcloud secrets add-iam-policy-binding database-url --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
# No key file in prod: signing upload/download URLs goes through IAM signBlob
gcloud iam service-accounts add-iam-policy-binding $SA --member=serviceAccount:$SA --role=roles/iam.serviceAccountTokenCreator

# `--source` deploys build with the default compute service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com --role=roles/run.builder
```

## 5. Migrations + reference data (from your laptop)

In a second terminal, open a tunnel to the database:

```sh
cloud-sql-proxy --gcloud-auth ${PROJECT_ID}:${REGION}:${SQL_INSTANCE} --port 5433
```

Back in the first terminal (from the repo root, after `source ~/.config/azime/prod.env`). Order matters: the general
reference import validates its AMA row references.

```sh
export DATABASE_URL=postgresql://azime:${DB_PASS}@localhost:5433/azime
pnpm --filter backend migrate
pnpm --filter backend ama:import
pnpm --filter backend ama:tables:import
pnpm --filter backend reference-data:import
unset DATABASE_URL   # so local dev doesn't point at prod
```

Never `drizzle-kit push` against prod. Schema changes = `pnpm --filter backend generate`,
commit the SQL, then rerun `migrate` through the proxy.

## 6. IAP service agent

```sh
gcloud beta services identity create --service=iap.googleapis.com --project=$PROJECT_ID
```

## 7. Deploy (every release)

Release flow: branch → PR (CI builds + tests) → squash-merge → if the release has a
new migration, run step 5's `migrate` through the proxy → `./scripts/deploy.sh`.

The script refuses to run unless you're on a clean `main` matching `origin/main`,
builds locally to fail fast, then runs the command below with the commit SHA as a
revision label. Cloud Build builds the `Dockerfile` remotely; no local Docker needed.

Keep migrations additive (add now, drop in a later release) so the previous revision
still works against the new schema and rollback stays instant.

Rollback = shift traffic to the previous revision (no rebuild):

```sh
gcloud run revisions list --service=$SERVICE --region=$REGION
gcloud run services update-traffic $SERVICE --region=$REGION --to-revisions=REVISION_NAME=100
# the next ./scripts/deploy.sh moves traffic back to latest (--to-latest)
```

The command the script runs:

```sh
gcloud beta run deploy $SERVICE --source . --region=$REGION \
  --service-account=$SA \
  --add-cloudsql-instances=${PROJECT_ID}:${REGION}:${SQL_INSTANCE} \
  --set-secrets=DATABASE_URL=database-url:latest \
  --env-vars-file=deploy/env.prod.yaml \
  --timeout=3600 --memory=1Gi --max-instances=2 \
  --no-allow-unauthenticated --iap
```

Non-secret env vars live in `deploy/env.prod.yaml` (committed; every deploy replaces the
whole set with that file). AI model/provider settings use the code defaults (Gemini via
Vertex); to override one, add it there (names in `backend/.env.example`). Keep every
workflow on Gemini unless OpenAI is also under a BAA. Secrets go in Secret Manager +
`--set-secrets`, never in the YAML.

## 8. One-time after the first deploy

```sh
export APP_URL=$(gcloud run services describe $SERVICE --region=$REGION --format='value(status.url)')

# IAP may call the service
gcloud run services add-iam-policy-binding $SERVICE --region=$REGION \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-iap.iam.gserviceaccount.com \
  --role=roles/run.invoker

# Who can sign in (repeat per user: both of you + the iPad account)
gcloud beta iap web add-iam-policy-binding --resource-type=cloud-run \
  --service=$SERVICE --region=$REGION \
  --member=user:someone@yourbusiness.com --role=roles/iap.httpsResourceAccessor

# Browser uploads PUT straight to the bucket via signed URLs
cat > /tmp/cors.json <<EOF
[{"origin": ["$APP_URL"], "method": ["PUT", "GET"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]
EOF
gcloud storage buckets update gs://$BUCKET --cors-file=/tmp/cors.json
```

Budget alert (find the ID with `gcloud billing accounts list`; emails billing admins):

```sh
gcloud billing budgets create --billing-account=BILLING_ACCOUNT_ID \
  --display-name="azime" --budget-amount=100USD \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
```

## 9. Smoke test

- [ ] Open `$APP_URL` as each approved user; a non-approved Google account is blocked.
- [ ] `$APP_URL/api/health` returns `{"ok":true}`.
- [ ] One de-identified case end to end: upload → extraction → summary → analysis →
      visit (incl. questionnaire on the iPad) → MMI → report.
- [ ] Watch the longest AI step finish without a timeout.
- [ ] iPad: sign in as `tablet@evalitas.com`; it lands on `/tablet` (open questionnaires)
      and any other page redirects back. Turn on Guided Access (Settings → Accessibility)
      so a patient can't leave Safari.
- [ ] Logs: `gcloud run services logs read $SERVICE --region=$REGION --limit=100`.

## Still to do in code

- [ ] Disable/hide debug panels in production. (Test-data routes are already off unless
      `ENABLE_TEST_DATA=true`.)

## The iPad account

`backend/src/tablet.ts` restricts `tablet@evalitas.com` to client pages, `/api/me`,
`/api/tablet/questionnaires` and the questionnaire fill/submit endpoints; everything else
is 403. It trusts IAP's `x-goog-authenticated-user-email` header without verifying the
signed `x-goog-iap-jwt-assertion`: only IAP has `run.invoker` (plus project owners,
who already have full access), so nobody else can reach the service to forge it. If
that ever changes (e.g. `--allow-unauthenticated`, a load balancer), add JWT verification.

## Recovery

- Restore: Console → SQL → `azime-db` → Backups → restore (or point-in-time clone to a
  new instance, then repoint the `database-url` secret and redeploy).
- Rollback a bad deploy: Console → Cloud Run → `azime` → Revisions → route 100% to the
  previous revision.

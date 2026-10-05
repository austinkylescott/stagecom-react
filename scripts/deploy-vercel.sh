#!/usr/bin/env bash
set -euo pipefail

: "${VERCEL_TOKEN:?Missing deployment token}"
: "${VERCEL_ORG_ID:?Missing organization ID}"
: "${VERCEL_PROJECT_ID:?Missing project ID}"

build_args=(build --token="$VERCEL_TOKEN")
deploy_args=(deploy --prebuilt --yes --token="$VERCEL_TOKEN")
if [ "$DEPLOY_TARGET" = production ]; then
  vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
  node --input-type=module <<'JS'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
const env = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'))
if (env.STAGECOM_DEMO_MODE !== 'false' || env.STAGECOM_DEMO_PASSWORD) {
  throw new Error('Production must disable demo mode and omit the demo password.')
}
JS
  build_args+=(--prod)
  deploy_args+=(--prod)
else
  vercel pull --yes --environment=preview --git-branch="$SOURCE_BRANCH" --token="$VERCEL_TOKEN"
fi

vercel "${build_args[@]}"
url=$(vercel "${deploy_args[@]}" \
  --meta githubDeployment=1 --meta "githubCommitRef=$SOURCE_BRANCH" \
  --meta "githubCommitSha=$SOURCE_SHA")
printf 'Deployment: %s\nSource: %s (%s)\nEnvironment: %s\n' \
  "$url" "$SOURCE_BRANCH" "$SOURCE_SHA" "$DEPLOY_TARGET" >> "$GITHUB_STEP_SUMMARY"

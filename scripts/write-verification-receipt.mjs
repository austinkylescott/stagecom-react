import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

if (process.env.VERIFICATION_PROFILE !== 'full')
  throw new Error('Only full verification can produce a release receipt.')
const receipt = {
  schemaVersion: 1,
  profile: 'full',
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  sourceBranch: process.env.SOURCE_BRANCH,
  repository: process.env.GITHUB_REPOSITORY,
  runId: process.env.GITHUB_RUN_ID,
}
if (!receipt.sourceBranch || !receipt.repository || !receipt.runId)
  throw new Error('Full CI identity is required.')
mkdirSync('verification-evidence', { recursive: true })
writeFileSync(
  'verification-evidence/verification.json',
  JSON.stringify(receipt, null, 2) + '\n',
)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { requireReleaseVerification } from './release-verification.mjs'
import { validateDeployment } from './delivery-policy.mjs'

const source = {
  sha: process.env.SOURCE_SHA,
  branch: process.env.RELEASE_BRANCH,
  repository: process.env.GITHUB_REPOSITORY,
}
validateDeployment('production', source.branch)
if (!/^[a-f0-9]{40}$/.test(source.sha ?? ''))
  throw new Error('A pinned commit SHA is required.')
if (!/^[\w.-]+\/[\w.-]+$/.test(source.repository ?? ''))
  throw new Error('A repository is required.')

const gh = (args) =>
  execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
const { workflow_runs: runs } = JSON.parse(
  gh([
    'api',
    '--method',
    'GET',
    `repos/${source.repository}/actions/workflows/ci.yml/runs`,
    '-f',
    `head_sha=${source.sha}`,
    '-f',
    'status=success',
    '-f',
    'per_page=20',
  ]),
)
let verifiedRun
for (const run of runs) {
  const dir = mkdtempSync(join(tmpdir(), 'stagecom-ci-evidence-'))
  try {
    gh([
      'run',
      'download',
      String(run.id),
      '--repo',
      source.repository,
      '--name',
      'full-verification',
      '--dir',
      dir,
    ])
    const receipt = JSON.parse(
      readFileSync(join(dir, 'verification.json'), 'utf8'),
    )
    requireReleaseVerification(receipt, run, source)
    verifiedRun = run
    break
  } catch {
    // A fast or older run may have no reusable full-verification receipt.
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
if (!verifiedRun)
  throw new Error(
    `No successful full CI evidence for ${source.sha}. Run the release PR's full CI before dispatching; release dispatch does not rerun regression.`,
  )
console.log(`Reusing full CI: ${verifiedRun.html_url}`)
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `Verified release source: \`${source.sha}\`\n\nFull CI: ${verifiedRun.html_url}\n`,
  )

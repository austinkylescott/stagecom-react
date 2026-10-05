import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

// Run the real delivery script against a fake CLI; never contact Vercel.
function deploy(target, branch, demoEnv = 'STAGECOM_DEMO_MODE=false\n') {
  const dir = mkdtempSync(join(tmpdir(), 'stagecom-delivery-'))
  try {
    mkdirSync(join(dir, 'scripts'))
    for (const file of [
      'deploy-vercel.sh',
      'check-delivery-policy.mjs',
      'delivery-policy.mjs',
    ]) {
      writeFileSync(
        join(dir, 'scripts', file),
        readFileSync(new URL(file, import.meta.url)),
      )
    }
    writeFileSync(
      join(dir, 'vercel'),
      `#!/usr/bin/env node
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
const args = process.argv.slice(2)
appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n')
if (args[0] === 'pull') {
  mkdirSync('.vercel', { recursive: true })
  writeFileSync('.vercel/.env.production.local', process.env.TEST_DEMO_ENV)
}
if (args[0] === 'deploy') console.log('https://example.vercel.app')
`,
      { mode: 0o755 },
    )
    // Node treats the fake CLI as ESM, like this repository.
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
    const result = spawnSync('bash', ['scripts/deploy-vercel.sh'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        DEPLOY_TARGET: target,
        SOURCE_BRANCH: branch,
        SOURCE_SHA: 'verified-sha',
        VERCEL_TOKEN: 'fake-token',
        VERCEL_ORG_ID: 'same-org',
        VERCEL_PROJECT_ID: 'same-project',
        GITHUB_STEP_SUMMARY: join(dir, 'summary'),
        TEST_DEMO_ENV: demoEnv,
      },
    })
    const calls = existsSync(join(dir, 'calls.jsonl'))
      ? readFileSync(join(dir, 'calls.jsonl'), 'utf8')
          .trim()
          .split('\n')
          .map(JSON.parse)
      : []
    return { ...result, calls }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('dev pulls branch-specific Preview variables and never builds or deploys Production', () => {
  const result = deploy('dev', 'dev', 'STAGECOM_DEMO_MODE=true\n')
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.calls.length, 3)
  assert.ok(result.calls[0].includes('--environment=preview'))
  assert.ok(result.calls[0].includes('--git-branch=dev'))
  assert.equal(result.calls.flat().includes('--prod'), false)
  assert.ok(result.calls[2].includes('githubCommitRef=dev'))
  assert.ok(result.calls[2].includes('githubCommitSha=verified-sha'))
})

test('release uses Production variables, build and deployment for the verified SHA', () => {
  const result = deploy('production', 'release/0.1.0')
  assert.equal(result.status, 0, result.stderr)
  assert.ok(result.calls[0].includes('--environment=production'))
  assert.ok(result.calls[1].includes('--prod'))
  assert.ok(result.calls[2].includes('--prod'))
  assert.ok(result.calls[2].includes('githubCommitRef=release/0.1.0'))
  assert.ok(result.calls[2].includes('githubCommitSha=verified-sha'))
})

test('unsafe Production demo configuration stops before build or deploy', () => {
  for (const env of [
    'STAGECOM_DEMO_MODE=true\n',
    'STAGECOM_DEMO_MODE=false\nSTAGECOM_DEMO_PASSWORD=unsafe\n',
    '',
  ]) {
    const result = deploy('production', 'release/0.1.0', env)
    assert.notEqual(result.status, 0)
    assert.equal(result.calls.length, 1)
  }
})

test('main and invalid source/target combinations stop before contacting Vercel', () => {
  for (const [target, branch] of [
    ['production', 'main'],
    ['production', 'dev'],
    ['dev', 'main'],
    ['preview', 'dev'],
  ]) {
    const result = deploy(target, branch)
    assert.notEqual(result.status, 0)
    assert.deepEqual(result.calls, [])
  }
})

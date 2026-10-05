import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requireReleaseVerification } from './release-verification.mjs'

const source = {
  sha: 'a'.repeat(40),
  branch: 'release/0.1.0',
  repository: 'example/stagecom',
}
const run = {
  id: 123,
  conclusion: 'success',
  status: 'completed',
  path: '.github/workflows/ci.yml',
  head_sha: source.sha,
  head_branch: source.branch,
  event: 'pull_request',
}
const receipt = {
  schemaVersion: 1,
  profile: 'full',
  sourceSha: source.sha,
  sourceBranch: source.branch,
  repository: source.repository,
  runId: '123',
}

test('an exact successful full CI result can authorize its pinned release source', () => {
  assert.doesNotThrow(() => requireReleaseVerification(receipt, run, source))
  assert.doesNotThrow(() =>
    requireReleaseVerification(receipt, { ...run, event: 'push' }, source),
  )
  assert.doesNotThrow(() =>
    requireReleaseVerification(
      { ...receipt, sourceBranch: 'main' },
      { ...run, head_branch: 'main' },
      source,
    ),
  )
})

test('fast, unrelated, failed, cancelled or unfinished evidence cannot authorize a release', () => {
  for (const change of [
    { profile: 'fast' },
    { sourceSha: 'b'.repeat(40) },
    { sourceBranch: 'dev' },
    { repository: 'other/repository' },
    { runId: '456' },
    { schemaVersion: 2 },
  ]) {
    assert.throws(() =>
      requireReleaseVerification({ ...receipt, ...change }, run, source),
    )
  }
  for (const change of [
    { conclusion: 'failure' },
    { conclusion: 'cancelled' },
    { status: 'in_progress' },
    { path: '.github/workflows/other.yml' },
    { head_sha: 'b'.repeat(40) },
    { head_branch: 'dev' },
    { event: 'workflow_dispatch' },
  ]) {
    assert.throws(() =>
      requireReleaseVerification(receipt, { ...run, ...change }, source),
    )
  }
})

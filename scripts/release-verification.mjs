export function requireReleaseVerification(receipt, run, source) {
  if (
    run.conclusion !== 'success' ||
    run.status !== 'completed' ||
    run.path !== '.github/workflows/ci.yml' ||
    run.head_sha !== source.sha ||
    !['push', 'pull_request'].includes(run.event) ||
    receipt.schemaVersion !== 1 ||
    receipt.profile !== 'full' ||
    receipt.sourceSha !== source.sha ||
    receipt.sourceBranch !== run.head_branch ||
    receipt.repository !== source.repository ||
    receipt.runId !== String(run.id)
  ) {
    throw new Error(
      'Full CI evidence does not match the pinned release commit.',
    )
  }
}

import {
  isBranchNameValid,
  validateDeployment,
  validatePullRequest,
} from './delivery-policy.mjs'

try {
  const [mode, source, target] = process.argv.slice(2)
  if (mode === 'pr') validatePullRequest(source, target)
  else if (mode === 'deploy') validateDeployment(target, source)
  else if (mode === 'branch' && isBranchNameValid(source)) {
    /* Valid push. */
  } else
    throw new Error(
      'Usage: check-delivery-policy.mjs pr|deploy|branch <branch> [target]',
    )
  console.log('Delivery policy passed.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

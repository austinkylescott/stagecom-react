export const releasePattern =
  /^release\/\d+\.\d+\.\d+(?:-[a-z0-9]+(?:[.-][a-z0-9]+)*)?$/
const ticketPattern =
  /^(feat|fix|refactor|test|docs|chore|hotfix)\/sta-[1-9]\d*-[a-z0-9]+(?:-[a-z0-9]+)*$/
const explorationPattern = /^prototype\/[a-z0-9]+(?:-[a-z0-9]+)*$/
const maintenancePattern = /^(chore|docs)\/[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isBranchNameValid(branch) {
  return (
    branch === 'main' ||
    branch === 'dev' ||
    releasePattern.test(branch) ||
    ticketPattern.test(branch) ||
    explorationPattern.test(branch) ||
    maintenancePattern.test(branch)
  )
}

export function validatePullRequest(source, target) {
  if (!isBranchNameValid(source))
    throw new Error(`Invalid branch name: ${source}`)
  if (target === 'main') {
    if (!releasePattern.test(source))
      throw new Error('Only a validated release branch may enter main.')
  } else if (target === 'dev') {
    if (source === 'main' || source === 'dev')
      throw new Error('Reset dev deliberately; do not use a main-to-dev PR.')
  } else if (releasePattern.test(target)) {
    if (source === 'dev')
      throw new Error(
        'Promote selected work branches; never merge the sandbox into a release.',
      )
  } else {
    throw new Error(`Unsupported PR target: ${target}`)
  }
}

export function validateDeployment(target, branch) {
  if (target === 'dev' && branch === 'dev') return
  if (target === 'production' && releasePattern.test(branch)) return
  throw new Error(
    `Cannot deploy ${branch} to ${target}. Main is never deployed.`,
  )
}

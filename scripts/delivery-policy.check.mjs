import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isBranchNameValid,
  validateDeployment,
  validatePullRequest,
} from './delivery-policy.mjs'

test('ticket, release, prototype and approved maintenance names are supported', () => {
  for (const name of [
    'feat/sta-76-hosted-review',
    'hotfix/sta-82-login',
    'release/0.1.0',
    'release/0.1.0-rc.1',
    'prototype/calendar-navigation',
    'chore/hosted-environments',
  ]) {
    assert.equal(isBranchNameValid(name), true, name)
  }
  for (const name of [
    'austinscott18/sta-76-hosted-review',
    'feat/no-ticket',
    'fix/sta-0-login',
    'release/latest',
    'release/0.1.0/extra',
    'feat/sta-76-UPPERCASE',
  ]) {
    assert.equal(isBranchNameValid(name), false, name)
  }
})

test('sandbox changes cannot enter a release wholesale and main accepts releases only', () => {
  assert.doesNotThrow(() =>
    validatePullRequest('feat/sta-76-hosted-review', 'dev'),
  )
  assert.doesNotThrow(() =>
    validatePullRequest('feat/sta-76-hosted-review', 'release/0.1.0'),
  )
  assert.doesNotThrow(() => validatePullRequest('release/0.1.0', 'main'))
  assert.throws(() => validatePullRequest('dev', 'release/0.1.0'))
  assert.throws(() => validatePullRequest('feat/sta-76-hosted-review', 'main'))
  assert.throws(() => validatePullRequest('main', 'dev'))
})

test('production accepts release branches only; dev accepts the sandbox only', () => {
  assert.doesNotThrow(() => validateDeployment('production', 'release/0.1.0'))
  assert.doesNotThrow(() => validateDeployment('dev', 'dev'))
  for (const branch of [
    'main',
    'dev',
    'hotfix/sta-82-login',
    'release/latest',
  ]) {
    assert.throws(() => validateDeployment('production', branch))
  }
  assert.throws(() => validateDeployment('dev', 'main'))
  assert.throws(() => validateDeployment('preview', 'release/0.1.0'))
})

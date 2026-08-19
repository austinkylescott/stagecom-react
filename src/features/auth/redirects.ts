const FALLBACK_AUTH_REDIRECT = '/app/callsheet'
const SAFE_NEXT_PREFIXES = [
  '/app',
  '/onboarding',
  '/theater',
  '/complete-profile',
]

type RedirectCandidate = {
  draftTheaterSlug?: string | null
  hasProfile: boolean
  inviteToken?: string
  next?: string
}

export function normalizeNextPath(
  next: string | undefined,
): string | undefined {
  if (!next) {
    return undefined
  }

  let decoded = next

  try {
    decoded = decodeURIComponent(next)
  } catch {
    decoded = next
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return undefined
  }

  if (
    decoded.startsWith('/login') ||
    decoded.startsWith('/signup') ||
    decoded.startsWith('/auth/callback')
  ) {
    return undefined
  }

  return SAFE_NEXT_PREFIXES.some(
    (prefix) => decoded === prefix || decoded.startsWith(`${prefix}/`),
  )
    ? decoded
    : undefined
}

export function resolvePostAuthPath({
  draftTheaterSlug,
  hasProfile,
  inviteToken,
  next,
}: RedirectCandidate): string {
  if (inviteToken) {
    return `/join/${encodeURIComponent(inviteToken)}`
  }

  if (!hasProfile) {
    return '/complete-profile'
  }

  const safeNext = normalizeNextPath(next)

  if (safeNext) {
    return safeNext
  }

  if (draftTheaterSlug) {
    return '/onboarding/theater'
  }

  return FALLBACK_AUTH_REDIRECT
}

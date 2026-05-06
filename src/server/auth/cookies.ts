import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

export const AUTH_ACCESS_COOKIE = 'stagecom-access-token'
export const AUTH_REFRESH_COOKIE = 'stagecom-refresh-token'

type CookieOptions = NonNullable<Parameters<typeof setCookie>[2]>

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

export function getAuthAccessTokenCookie() {
  return getCookie(AUTH_ACCESS_COOKIE)
}

export function setAuthCookies({
  accessToken,
  expiresAt,
  refreshToken,
}: {
  accessToken: string
  expiresAt?: number | null
  refreshToken?: string
}) {
  const maxAge = expiresAt
    ? Math.max(60, expiresAt - Math.floor(Date.now() / 1000))
    : 60 * 60

  setCookie(AUTH_ACCESS_COOKIE, accessToken, {
    ...authCookieOptions,
    maxAge,
  })

  if (refreshToken) {
    setCookie(AUTH_REFRESH_COOKIE, refreshToken, {
      ...authCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    })
  }
}

export function clearAuthCookies() {
  deleteCookie(AUTH_ACCESS_COOKIE, authCookieOptions)
  deleteCookie(AUTH_REFRESH_COOKIE, authCookieOptions)
}

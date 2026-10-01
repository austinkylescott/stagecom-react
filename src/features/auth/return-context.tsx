import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { normalizeNextPath } from './redirects'

// HTTP redirects cannot read a fragment. Browsers retain it on the login URL;
// capture it before generating the Supabase callback so the selection survives.
export function usePreserveAuthReturnFragment({
  mode,
  next,
}: {
  mode: 'login' | 'signup'
  next?: string
}) {
  const navigate = useNavigate()
  useEffect(() => {
    const fragment = window.location.hash
    if (!fragment || !next || next.includes('#') || !normalizeNextPath(next))
      return
    void navigate({
      to: mode === 'login' ? '/login' : '/signup',
      search: (previous) => ({ ...previous, next: `${next}${fragment}` }),
      hash: '',
      replace: true,
    })
  }, [mode, next, navigate])
}

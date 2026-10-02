import { createServerFn } from '@tanstack/react-start'
import { getPublicProgramming } from './queries'

export const getPublicProgrammingFn = createServerFn({ method: 'GET' }).handler(
  () => getPublicProgramming(),
)

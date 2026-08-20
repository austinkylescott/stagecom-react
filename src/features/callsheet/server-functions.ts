import { createServerFn } from '@tanstack/react-start'

import { getMyCallsheet } from './queries'

export const getMyCallsheetFn = createServerFn({ method: 'GET' }).handler(
  async () => getMyCallsheet(),
)

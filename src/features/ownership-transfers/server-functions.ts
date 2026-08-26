import { createServerFn } from '@tanstack/react-start'

import {
  proposeTheaterOwnershipTransfer,
  respondToTheaterOwnershipTransfer,
} from './commands'
import {
  proposeTheaterOwnershipTransferInputSchema,
  respondToTheaterOwnershipTransferInputSchema,
} from './schemas'

export const proposeTheaterOwnershipTransferFn = createServerFn({
  method: 'POST',
})
  .validator(proposeTheaterOwnershipTransferInputSchema)
  .handler(async ({ data }) => proposeTheaterOwnershipTransfer(data))

export const respondToTheaterOwnershipTransferFn = createServerFn({
  method: 'POST',
})
  .validator(respondToTheaterOwnershipTransferInputSchema)
  .handler(async ({ data }) => respondToTheaterOwnershipTransfer(data))

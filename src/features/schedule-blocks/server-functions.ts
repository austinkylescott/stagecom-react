import { createServerFn } from '@tanstack/react-start'
import { createScheduleBlock, finishScheduleBlock, updateScheduleBlock } from './commands'
import { getTheaterScheduleBlocks } from './queries'
import { createScheduleBlockInputSchema, finishScheduleBlockInputSchema, theaterScheduleBlocksInputSchema, updateScheduleBlockInputSchema } from './schemas'
export const getTheaterScheduleBlocksFn = createServerFn({ method: 'GET' }).validator(theaterScheduleBlocksInputSchema).handler(({ data }) => getTheaterScheduleBlocks(data))
export const createScheduleBlockFn = createServerFn({ method: 'POST' }).validator(createScheduleBlockInputSchema).handler(({ data }) => createScheduleBlock(data))
export const updateScheduleBlockFn = createServerFn({ method: 'POST' }).validator(updateScheduleBlockInputSchema).handler(({ data }) => updateScheduleBlock(data))
export const finishScheduleBlockFn = createServerFn({ method: 'POST' }).validator(finishScheduleBlockInputSchema).handler(({ data }) => finishScheduleBlock(data))

import { createServerFn } from '@tanstack/react-start'
import { closePoll, openPoll, saveAnswers } from './commands'
import { getPolls } from './queries'
import {
  closePollSchema,
  openPollSchema,
  readPollsSchema,
  saveAnswersSchema,
} from './schemas'

export const getPollsFn = createServerFn({ method: 'GET' })
  .validator(readPollsSchema)
  .handler(({ data }) => getPolls(data.eventId))
export const openPollFn = createServerFn({ method: 'POST' })
  .validator(openPollSchema)
  .handler(({ data }) => openPoll(data))
export const closePollFn = createServerFn({ method: 'POST' })
  .validator(closePollSchema)
  .handler(({ data }) => closePoll(data))
export const saveAnswersFn = createServerFn({ method: 'POST' })
  .validator(saveAnswersSchema)
  .handler(({ data }) => saveAnswers(data))

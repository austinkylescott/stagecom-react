import { appError } from '@/server/errors'

type LocalDateTimeParts = {
  day: number
  hour: number
  minute: number
  month: number
  year: number
}

export type ResolvedLocalDateTime = {
  startsAt: string
  utcOffsetMinutes: number
}

export function resolveLocalDateTime(
  localStartsAt: string,
  timezoneName: string,
): ResolvedLocalDateTime {
  const parts = parseLocalDateTime(localStartsAt)
  const formatter = createFormatter(timezoneName)
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  )
  const matches: ResolvedLocalDateTime[] = []

  for (let offsetMinutes = -840; offsetMinutes <= 840; offsetMinutes += 15) {
    const candidate = localAsUtc - offsetMinutes * 60_000
    const rendered = formatParts(formatter, new Date(candidate))

    if (sameParts(rendered, parts)) {
      matches.push({
        startsAt: new Date(candidate).toISOString(),
        utcOffsetMinutes: offsetMinutes,
      })
    }
  }

  if (matches.length === 0) {
    throw appError(
      'validation_error',
      'That local time does not exist in the selected timezone.',
    )
  }

  if (matches.length > 1) {
    throw appError(
      'validation_error',
      'That local time is ambiguous in the selected timezone. Choose another time.',
    )
  }

  return matches[0]
}

function createFormatter(timezoneName: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      timeZone: timezoneName,
      year: 'numeric',
    })
  } catch {
    throw appError('validation_error', 'The selected timezone is invalid.')
  }
}

function parseLocalDateTime(value: string): LocalDateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)

  if (!match) {
    throw appError('validation_error', 'Use a complete local date and time.')
  }

  const [, year, month, day, hour, minute] = match.map(Number)
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute))

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day ||
    candidate.getUTCHours() !== hour ||
    candidate.getUTCMinutes() !== minute
  ) {
    throw appError('validation_error', 'The local date and time is invalid.')
  }

  return { day, hour, minute, month, year }
}

function formatParts(formatter: Intl.DateTimeFormat, date: Date) {
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )

  return {
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    month: values.month,
    year: values.year,
  }
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  )
}

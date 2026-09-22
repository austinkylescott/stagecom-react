export function parseReservedRange(value: unknown) {
  if (typeof value !== 'string') return null
  const match = value.match(/^\[["']?([^,"']+)["']?,["']?([^)"']+)["']?\)$/)
  return match ? { endsAt: match[2], startsAt: match[1] } : null
}

export function getMissingPublicationFields(theater: {
  city?: string | null
  country?: string | null
  name: string
  postalCode?: string | null
  slug: string
  stateRegion?: string | null
  street?: string | null
  tagline?: string | null
  timezone?: string | null
}) {
  const fields: Array<[string, string | null | undefined]> = [
    ['name', theater.name],
    ['slug', theater.slug],
    ['tagline', theater.tagline],
    ['street', theater.street],
    ['city', theater.city],
    ['stateRegion', theater.stateRegion],
    ['postalCode', theater.postalCode],
    ['country', theater.country],
    ['timezone', theater.timezone],
  ]

  return fields.filter(([, value]) => !value?.trim()).map(([field]) => field)
}

import { readFileSync, writeFileSync } from 'node:fs'

if (process.env.CI !== 'true')
  throw new Error('This service reduction is only for disposable CI checkouts.')
const path = 'supabase/config.toml'
let config = readFileSync(path, 'utf8')
for (const section of ['studio', 'analytics', 'realtime', 'edge_runtime']) {
  const block = new RegExp(`(\\[${section}\\]\\n)([\\s\\S]*?)(?=\\n\\[|$)`)
  const match = config.match(block)
  if (!match || !/^enabled = (true|false)$/m.test(match[2]))
    throw new Error(`Expected a configured ${section} service.`)
  config = config.replace(
    block,
    (_, heading, body) =>
      heading + body.replace(/^enabled = (true|false)$/m, 'enabled = false'),
  )
}
writeFileSync(path, config)
console.log(
  'CI keeps database, Auth, REST, Storage and email; omits Studio, analytics, Realtime and Edge Runtime.',
)

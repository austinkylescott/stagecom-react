import { appendFileSync, readFileSync } from 'node:fs'

const status = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const values = {
  VITE_APP_URL: 'http://localhost:3000',
  VITE_SUPABASE_URL: status.API_URL,
  VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: status.DB_URL,
  STAGECOM_DEMO_MODE: 'true',
  STAGECOM_DEMO_PASSWORD: 'stagecom-disposable-ci-password',
}
if (new URL(values.VITE_SUPABASE_URL).hostname !== '127.0.0.1') {
  throw new Error('CI must use its disposable local Supabase stack.')
}
for (const [name, value] of Object.entries(values)) {
  if (!value || /[\r\n]/.test(value))
    throw new Error(`Invalid local CI value: ${name}`)
  if (
    name.includes('KEY') ||
    name.includes('PASSWORD') ||
    name === 'SUPABASE_DB_URL'
  ) {
    console.log(`::add-mask::${value}`)
  }
  appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`)
}

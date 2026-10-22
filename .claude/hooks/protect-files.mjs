import { readFileSync } from 'node:fs'
const { tool_input } = JSON.parse(readFileSync(0, 'utf8'))
const path = tool_input?.file_path ?? ''
const blocked = [/mockServiceWorker\.js$/, /package-lock\.json$/, /(^|\/)\.env(\.|$)/]
if (blocked.some((re) => re.test(path))) {
  console.error(`Blocked: ${path} is generated or sensitive. Use the proper command (npm i / msw init) instead.`)
  process.exit(2)
}
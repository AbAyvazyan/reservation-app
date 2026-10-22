import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const { tool_input } = JSON.parse(readFileSync(0, 'utf8'))
const file = tool_input?.file_path
if (!file || !/\.(ts|tsx)$/.test(file)) process.exit(0)
const r = spawnSync('npx', ['eslint', '--fix', file], { encoding: 'utf8' })
if (r.status !== 0) {
  console.error(`ESLint errors in ${file}:\n${r.stdout}${r.stderr}`)
  process.exit(2)
}
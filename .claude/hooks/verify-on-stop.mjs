import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const input = JSON.parse(readFileSync(0, 'utf8'))
if (input.stop_hook_active) process.exit(0) // avoid infinite loop
const run = (args) => spawnSync('npm', args, { encoding: 'utf8' })
for (const args of [['run', 'typecheck'], ['test']]) {
  const r = run(args)
  if (r.status !== 0) {
    console.error(`\`npm ${args.join(' ')}\` failed — fix before finishing:\n${(r.stdout + r.stderr).slice(-4000)}`)
    process.exit(2)
  }
}
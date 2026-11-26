import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.dirname(frontend)
const python = process.env.CV_PYTHON || path.join(root, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
if (!existsSync(python)) {
  console.error('No se encontró Python del proyecto. Define CV_PYTHON con la ruta de tu intérprete.')
  process.exit(1)
}
const processes = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of processes) child.kill('SIGTERM')
  const force = setTimeout(() => { for (const child of processes) child.kill('SIGKILL') }, 5000)
  force.unref()
}
for (const [command, args, cwd] of [
  [python, ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'], root],
  [process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'], frontend],
]) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' })
  processes.push(child)
  child.on('error', (error) => { console.error(error.message); stop(1) })
  child.on('exit', (code, signal) => { if (!stopping) stop(code ?? (signal ? 1 : 0)) })
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

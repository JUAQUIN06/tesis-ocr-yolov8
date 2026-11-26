import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const python = process.env.CV_PYTHON || path.resolve('..', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

export default defineConfig({
  testDir: './tests/fullstack',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 45_000 },
  outputDir: 'test-results/fullstack',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: `"${python}" -m uvicorn backend.main:app --app-dir .. --host 127.0.0.1 --port 8000`, url: 'http://127.0.0.1:8000/api/health', timeout: 90_000, reuseExistingServer: !process.env.CI },
    { command: process.env.E2E_PREVIEW ? 'npm run preview -- --port 5173 --strictPort --host 127.0.0.1' : 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
  ],
})

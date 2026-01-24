import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 60000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  reporter: [['html', { open: 'never' }], ['list']],
  // Electron-specific configuration
  projects: [
    {
      name: 'electron',
      use: {
        // Tests will use custom Electron fixture
      }
    }
  ]
})

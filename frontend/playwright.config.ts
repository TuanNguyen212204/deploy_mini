import { defineConfig, devices } from '@playwright/test';

const DEFAULT_BASE_URL = 'http://localhost:5173';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL;
const isRemoteBaseUrl = !!process.env.PLAYWRIGHT_BASE_URL;
const skipWebServer = process.env.PW_SKIP_WEBSERVER === '1' || process.env.PW_SKIP_WEBSERVER === 'true';

// App hiện tại throw nếu thiếu Supabase env, nên E2E cần set tối thiểu 2 biến này.
// Khi chưa muốn dùng Supabase thật, ta chạy với URL giả và mock network trong test.
const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const VITE_SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'test-anon-key';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Nếu user set PLAYWRIGHT_BASE_URL (ví dụ chạy against preview) thì mặc định không spin webserver.
  webServer:
    isRemoteBaseUrl || skipWebServer
      ? undefined
      : {
          command: 'npm run dev -- --host 127.0.0.1 --port 5173',
          url: DEFAULT_BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            VITE_SUPABASE_URL,
            VITE_SUPABASE_PUBLISHABLE_KEY,
            // Tránh phụ thuộc backend trong E2E; test sẽ mock endpoint trending.
            VITE_USE_TRENDING_API: process.env.VITE_USE_TRENDING_API || 'true',
          },
        },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});


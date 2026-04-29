import type { Page } from '@playwright/test';

export type MockUser = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string | null;
};

function resolveSupabaseUrl(): string {
  // App build (Vite) lấy từ import.meta.env, còn test runner lấy từ process.env.
  // Ở đây chỉ cần trùng với giá trị set trong playwright.config.ts.
  return process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
}

export function supabaseStorageKey(supabaseUrl = resolveSupabaseUrl()): string {
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split('.')[0] || host;
  return `sb-${projectRef}-auth-token`;
}

export function buildSupabaseSession(user: MockUser) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nowSec + 3600,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      phone: user.phone ?? null,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: user.full_name ?? 'E2E User', phone: user.phone ?? null },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export async function setLoggedInStorageState(
  page: Page,
  user: MockUser = { id: 'e2e-user-id', email: 'e2e@example.com', full_name: 'E2E User', phone: null },
) {
  const key = supabaseStorageKey();
  const session = buildSupabaseSession(user);

  await page.addInitScript(({ k, v }) => {
    window.localStorage.setItem(k, JSON.stringify(v));
  }, { k: key, v: session });

  return { key, session };
}

export async function mockSupabaseAuthHappyPath(
  page: Page,
  opts?: { user?: MockUser },
) {
  const user = opts?.user ?? { id: 'e2e-user-id', email: 'e2e@example.com', full_name: 'E2E User', phone: null };
  const session = buildSupabaseSession(user);

  // signInWithPassword → POST /auth/v1/token?grant_type=password
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });

  // AuthContext.fetchProfile → GET /rest/v1/users?select=*&id=eq.<userId>
  await page.route('**/rest/v1/users**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.full_name ?? 'E2E User',
        plan: 'free',
        phone: user.phone ?? null,
        created_at: new Date().toISOString(),
      }),
    });
  });
}

export async function mockSupabaseWrongCredentials(page: Page) {
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      }),
    });
  });
}


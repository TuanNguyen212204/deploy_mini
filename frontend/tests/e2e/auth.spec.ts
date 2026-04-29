import { expect, test } from '@playwright/test';
import { AuthPagePO } from './pages/AuthPage.po';
import {
  mockSupabaseAuthHappyPath,
  mockSupabaseWrongCredentials,
} from './_helpers/supabaseMock';

test.describe('Auth UI', () => {
  test('Login page renders (fields + button)', async ({ page }) => {
    const auth = new AuthPagePO(page);
    await auth.goto();

    await expect(auth.heading).toHaveText(/đăng nhập/i);
    await expect(auth.email).toBeVisible();
    await expect(auth.password).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng ký ngay/i })).toBeVisible();
  });

  test('Register mode renders (name/phone/email/password)', async ({ page }) => {
    const auth = new AuthPagePO(page);
    await auth.goto();
    await auth.switchToRegister();

    await expect(auth.heading).toHaveText(/đăng ký/i);
    await expect(auth.name).toBeVisible();
    await expect(auth.phone).toBeVisible();
    await expect(auth.email).toBeVisible();
    await expect(auth.password).toBeVisible();
    await expect(page.getByRole('button', { name: /tạo tài khoản/i })).toBeVisible();
  });
});

test.describe('Auth flows (mocked Supabase)', () => {
  test('Successful login (happy path) redirects to home', async ({ page }) => {
    await mockSupabaseAuthHappyPath(page);

    const auth = new AuthPagePO(page);
    await auth.goto();

    await auth.login('e2e@example.com', 'correct-password');

    await expect(page).toHaveURL('/');
    // Không phụ thuộc dữ liệu backend; chỉ cần UI home render.
    await expect(page.getByRole('heading', { name: /mua sắm tinh tế/i })).toBeVisible();
  });

  test('Login with wrong credentials shows error message', async ({ page }) => {
    await mockSupabaseWrongCredentials(page);

    const auth = new AuthPagePO(page);
    await auth.goto();
    await auth.login('e2e@example.com', 'wrong-password');

    await expect(
      page.getByText(/email hoặc mật khẩu không đúng/i),
    ).toBeVisible();
  });
});


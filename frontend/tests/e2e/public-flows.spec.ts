import { expect, test } from '@playwright/test';
import { setLoggedInStorageState } from './_helpers/supabaseMock';

test.describe('Public vs protected routing (current behavior)', () => {
  test('Unauthenticated user visiting "/" is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /đăng nhập/i })).toBeVisible();
  });
});

test.describe('Main flows (authenticated via storageState)', () => {
  test('Authenticated user can see homepage', async ({ page }) => {
    await setLoggedInStorageState(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /mua sắm tinh tế/i })).toBeVisible();
  });

  test('Authenticated user can navigate to search from homepage', async ({ page }) => {
    await setLoggedInStorageState(page);

    await page.goto('/');
    await page.getByPlaceholder('Tìm một món bạn đang cân nhắc...').fill('Anessa');
    await page.getByRole('button', { name: /tìm và so sánh/i }).click();

    await expect(page).toHaveURL(/\/search\?q=Anessa/);
    // SearchResultsPage luôn render h1 này, không phụ thuộc data backend.
    await expect(
      page.getByRole('heading', { name: /tìm một món bạn đang cân nhắc/i }),
    ).toBeVisible();
  });

  test('Authenticated user can open Trending deals page', async ({ page }) => {
    await setLoggedInStorageState(page);

    await page.goto('/trending-deals');
    await expect(page.getByRole('heading', { name: /trending deals/i })).toBeVisible();
  });
});


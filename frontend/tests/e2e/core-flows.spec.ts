import { expect, test } from '@playwright/test';
import { setLoggedInStorageState } from './_helpers/supabaseMock';
import { fetchAnyProductId } from './_helpers/backendClient';
import { AppHeaderPO } from './pages/AppHeader.po';

test.describe('Core flows (no auth real, backend real)', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedInStorageState(page);
  });

  test('Header navigation works across main pages', async ({ page }) => {
    const header = new AppHeaderPO(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /mua sắm tinh tế/i })).toBeVisible();

    await header.navLink('So sánh giá').click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /tìm một món bạn đang cân nhắc/i })).toBeVisible();

    await header.navLink('Chọn lọc hôm nay').click();
    await expect(page).toHaveURL(/\/deals/);
    await expect(page.getByRole('heading', { name: /những lựa chọn đáng cân nhắc/i })).toBeVisible();

    await header.navLink('Yêu thích').click();
    await expect(page).toHaveURL(/\/wishlist/);
    await expect(page.getByRole('heading', { name: /những món bạn/i })).toBeVisible();

    await header.navLink('Theo dõi giá').click();
    await expect(page).toHaveURL(/\/alerts/);
    await expect(page.getByRole('heading', { name: /những mức giá bạn/i })).toBeVisible();
  });

  test('Logout redirects to /login (mock Supabase signOut)', async ({ page }) => {
    // Logout là auth-related, mock cho ổn định (không phụ thuộc Supabase thật).
    await page.route('**/auth/v1/logout**', async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    const header = new AppHeaderPO(page);
    await page.goto('/');

    await expect(header.logoutButton).toBeVisible();
    await header.logoutButton.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /đăng nhập/i })).toBeVisible();
  });

  test('Deals page tabs can be switched (smoke)', async ({ page }) => {
    await page.goto('/deals');
    await expect(page.getByRole('heading', { name: /những lựa chọn đáng cân nhắc/i })).toBeVisible();

    await page.getByRole('button', { name: 'Đáng mua' }).click();
    await expect(page.getByRole('heading', { name: /đang ở vùng giá đẹp/i })).toBeVisible();

    await page.getByRole('button', { name: 'Theo dõi thêm' }).click();
    await expect(page.getByRole('heading', { name: /cần quan sát kỹ hơn/i })).toBeVisible();
  });

  test('Trending deals page loads and pagination controls are present', async ({ page }) => {
    await page.goto('/trending-deals');
    await expect(page.getByRole('heading', { name: /trending deals/i })).toBeVisible();

    const prev = page.getByRole('button', { name: 'Trước' });
    const next = page.getByRole('button', { name: 'Sau' });
    await expect(prev).toBeVisible();
    await expect(next).toBeVisible();

    // Nếu có nhiều trang, "Sau" sẽ enabled.
    if (await next.isEnabled()) {
      await next.click();
      await expect(page).toHaveURL(/\/trending-deals\?page=2/);
    }
  });

  test('Search filters update querystring (platform + sort)', async ({ page }) => {
    await page.goto('/search');
    await expect(
      page.getByRole('heading', { name: /tìm một món bạn đang cân nhắc/i }),
    ).toBeVisible();

    // Platform filter
    await page.getByRole('button', { name: 'Hasaki' }).click();
    await expect(page).toHaveURL(/platform=Hasaki/);

    // Sort select (combobox #2 trong form: category rồi sort)
    const sortSelect = page.getByRole('combobox').nth(1);
    await sortSelect.selectOption('rating');
    await expect(page).toHaveURL(/sort=rating/);
  });

  test('Product detail hits compare/history endpoints and can add/remove wishlist', async ({ page, request }) => {
    const productId = await fetchAnyProductId(request);
    const userId = '6a63d257-c0d6-4650-bd78-99cb1c8bd671';

    // Làm sạch state wishlist trên backend để tránh add bị 409 do run trước.
    await request.delete(`http://localhost:8080/api/wishlist/${productId}`, {
      params: { userId },
    });

    const compareResP = page.waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        res.url().includes(`/api/compare/${productId}`) &&
        res.status() === 200,
      { timeout: 20_000 },
    );
    const historyResP = page.waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        res.url().includes(`/api/v1/price-history/${productId}`) &&
        res.status() === 200,
      { timeout: 20_000 },
    );

    await page.goto(`/product/${productId}`);

    // Assert API payload shape (đảm bảo endpoint format, không chỉ render UI)
    const compareRes = await compareResP;
    const compareJsonUnknown: unknown = await compareRes.json();
    expect(compareJsonUnknown).toBeTruthy();
    const compareJson = compareJsonUnknown as Record<string, unknown>;
    expect(String(compareJson.productId ?? '')).toBeTruthy();
    const comparisons = compareJson.comparisons;
    expect(Array.isArray(comparisons)).toBeTruthy();
    expect((comparisons as unknown[]).length).toBeGreaterThan(0);

    const historyRes = await historyResP;
    const historyJsonUnknown: unknown = await historyRes.json();
    expect(historyJsonUnknown).toBeTruthy();
    const historyJson = historyJsonUnknown as Record<string, unknown>;
    expect(Array.isArray(historyJson.platforms)).toBeTruthy();

    // ProductSummary h1 = product name
    await expect(page.locator('h1').first()).toBeVisible();

    // Quick compare + chart title (nếu có history)
    await expect(page.getByRole('heading', { name: 'Nơi mua phù hợp' })).toBeVisible();
    await expect(page.getByText(/biến động giá gần đây/i)).toBeVisible();

    // Add to wishlist
    const saveBtn = page.getByRole('button', { name: /lưu wishlist/i });
    await expect(saveBtn).toBeVisible();
    // Nếu đã lưu từ trước thì remove trước để đảm bảo click tạo POST /add
    const alreadySaved = page.getByRole('button', { name: /đã lưu wishlist/i });
    if (await alreadySaved.isVisible()) {
      const delReqP = page.waitForRequest(
        (req) =>
          req.method() === 'DELETE' && req.url().includes('/api/wishlist/'),
        { timeout: 15_000 },
      );
      await alreadySaved.click();
      const delReq = await delReqP;
      await delReq.response();
    }

    // Đảm bảo UI cũng ở trạng thái "chưa lưu"
    const savedBtn = page.getByRole('button', { name: /đã lưu wishlist/i });
    if (await savedBtn.isVisible()) {
      const delReqP = page.waitForRequest(
        (req) => req.method() === 'DELETE' && req.url().includes('/api/wishlist/'),
        { timeout: 15_000 },
      );
      await savedBtn.click();
      const delReq = await delReqP;
      await delReq.response();
    }

    // Click add; nếu vẫn 409 (backend state bẩn), clean 1 lần nữa rồi retry 1 lần.
    for (let attempt = 0; attempt < 2; attempt++) {
      const addReqP = page.waitForRequest(
        (req) => req.method() === 'POST' && req.url().includes('/api/wishlist/add'),
        { timeout: 20_000 },
      );
      await page.getByRole('button', { name: /lưu wishlist/i }).click();
      const addReq = await addReqP;
      const addRes = await addReq.response();
      expect(addRes).toBeTruthy();
      if (addRes!.status() >= 200 && addRes!.status() < 300) break;
      if (addRes!.status() !== 409 || attempt === 1) {
        throw new Error(`Wishlist add failed with status ${addRes!.status()}`);
      }
      await request.delete(`http://localhost:8080/api/wishlist/${productId}`, {
        params: { userId },
      });
    }

    // Verify in wishlist page
    const productName = (await page.locator('h1').first().innerText()).trim();
    await page.goto('/wishlist');
    const card = page.locator('main article').filter({ hasText: productName });
    await expect(card).toHaveCount(1);

    // Remove from wishlist (button text "Xóa")
    const removeReqP = page.waitForRequest(
      (req) => req.method() === 'DELETE' && req.url().includes('/api/wishlist/'),
      { timeout: 15_000 },
    );
    await card.getByRole('button', { name: /^xóa$/i }).click();
    const removeReq = await removeReqP;
    const removeRes = await removeReq.response();
    expect(removeRes).toBeTruthy();
    // Backend có thể trả 204 (xóa ok) hoặc 404 (đã xóa/không tồn tại) — đều coi là đồng bộ.
    expect([204, 404]).toContain(removeRes!.status());

    // Không assert rỗng tuyệt đối (có thể wishlist có sẵn item khác),
    // nhưng item vừa thêm phải biến mất.
    // Một số trường hợp state optimistic có thể bị rollback bởi logic UI,
    // nên reload để xác nhận theo nguồn dữ liệu backend.
    await page.reload();
    await expect(page.locator('main article').filter({ hasText: productName })).toHaveCount(0);
  });

  test('Wishlist edge cases: duplicate add shows alert (409)', async ({ page, request }) => {
    const productId = await fetchAnyProductId(request);
    await page.goto(`/product/${productId}`);

    // Đảm bảo sạch state trên backend trước khi test.
    const userId = '6a63d257-c0d6-4650-bd78-99cb1c8bd671';
    await request.delete(`http://localhost:8080/api/wishlist/${productId}`, {
      params: { userId },
    });

    // Chờ WishlistProvider fetch lần đầu (ổn định state UI).
    await page.waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        res.url().includes(`/api/wishlist/${userId}`) &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 15_000 },
    );

    // Đảm bảo ProductSummary đã render.
    await expect(page.locator('h1').first()).toBeVisible();

    // Đảm bảo UI đang ở trạng thái "chưa lưu" (để click sẽ gọi POST /add).
    // Ở một số run, UI có thể đang ở trạng thái "Đã lưu wishlist" do state cũ;
    // nếu vậy thì remove trước để quay về "Lưu wishlist".
    const saveBtn = page.getByRole('button', { name: 'Lưu wishlist', exact: true });
    const savedBtn = page.getByRole('button', { name: /đã lưu wishlist/i });

    if (!(await saveBtn.isVisible())) {
      if (await savedBtn.isVisible()) {
        const delReqP = page.waitForRequest(
          (req) => req.method() === 'DELETE' && req.url().includes('/api/wishlist/'),
          { timeout: 15_000 },
        );
        await savedBtn.click();
        const delReq = await delReqP;
        await delReq.response();
      }
    }

    await expect(saveBtn).toBeVisible();

    // Tạo mismatch: backend đã có item nhưng UI chưa biết (chưa fetch lại)
    await request.post('http://localhost:8080/api/wishlist/add', {
      data: { userId, productId },
    });

    // Click "Lưu wishlist" -> backend trả 409 (UI có thể alert; không bắt buộc để pass)
    const add2ReqP = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().includes('/api/wishlist/add'),
      { timeout: 20_000 },
    );
    await saveBtn.click();
    const add2Req = await add2ReqP;
    const add2Res = await add2Req.response();
    expect(add2Res).toBeTruthy();
    expect(add2Res!.status()).toBe(409);
    // Best-effort: nếu có alert thì accept để không block các bước khác.
    try {
      const dialog = await page.waitForEvent('dialog', { timeout: 2000 });
      await dialog.accept();
    } catch {
      // no-op
    }

    // Cleanup
    await request.delete(`http://localhost:8080/api/wishlist/${productId}`, {
      params: { userId },
    });
  });

  test('Wishlist edge cases: remove 404 does not rollback UI', async ({ page, request }) => {
    const productId = await fetchAnyProductId(request);
    const userId = '6a63d257-c0d6-4650-bd78-99cb1c8bd671';

    // Add qua UI để đảm bảo WishlistProvider state có item (không phụ thuộc refetch).
    await request.delete(`http://localhost:8080/api/wishlist/${productId}`, {
      params: { userId },
    });
    await page.goto(`/product/${productId}`);
    const saveBtn = page.getByRole('button', { name: 'Lưu wishlist', exact: true });
    const savedBtn = page.getByRole('button', { name: /đã lưu wishlist/i });

    // Nếu UI đang ở trạng thái đã lưu thì remove trước để quay về "Lưu wishlist"
    if (!(await saveBtn.isVisible()) && (await savedBtn.isVisible())) {
      const delReqP = page.waitForRequest(
        (req) => req.method() === 'DELETE' && req.url().includes('/api/wishlist/'),
        { timeout: 15_000 },
      );
      await savedBtn.click();
      const delReq = await delReqP;
      await delReq.response();
    }

    await expect(saveBtn).toBeVisible();
    const addReqP = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().includes('/api/wishlist/add'),
      { timeout: 20_000 },
    );
    await saveBtn.click();
    const addReq = await addReqP;
    await addReq.response();

    await page.goto('/wishlist');
    const card = page.locator('main article').filter({
      has: page.locator(`a[href="/product/${productId}"]`),
    });
    await expect(card).toHaveCount(1);

    // Remove on backend first -> UI remove will get 404
    await request.delete(`http://localhost:8080/api/wishlist/${productId}`, {
      params: { userId },
    });

    const remove404 = page.waitForResponse(
      (res) =>
        res.request().method() === 'DELETE' &&
        res.url().includes(`/api/wishlist/${productId}`) &&
        res.status() === 404,
      { timeout: 15_000 },
    );
    await card.getByRole('button', { name: /^xóa$/i }).click();
    await remove404;

    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(
      page.locator('main article').filter({
        has: page.locator(`a[href="/product/${productId}"]`),
      }),
    ).toHaveCount(0);
  });

  test('Alerts page renders rows from mockAlerts and has action buttons', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByRole('heading', { name: /những mức giá bạn/i })).toBeVisible();

    // Ít nhất có 1 card với các nút actions
    await expect(page.getByRole('button', { name: /chỉnh alert/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /tạm dừng/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^xóa$/i }).first()).toBeVisible();
  });
});


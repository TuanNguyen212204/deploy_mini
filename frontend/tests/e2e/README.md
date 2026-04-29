## Playwright E2E (PriceHawk)

### Chạy test

- `npm run e2e`
- `npm run e2e:ui`

Mặc định Playwright sẽ tự chạy `npm run dev` ở cổng `5173`.

### Chạy against môi trường khác (preview/remote)

- Set `PLAYWRIGHT_BASE_URL` tới URL môi trường muốn test.
- Set `PW_SKIP_WEBSERVER=1` để Playwright không tự spin dev server.

### Ghi chú auth hiện tại

Frontend đang dùng **Supabase Auth**. E2E test hiện:

- Mock request Supabase auth bằng `page.route()` (xem `tests/e2e/_helpers/supabaseMock.ts`)
- Hoặc set localStorage session (storageState) để vào các route bị `ProtectedRoute` chặn.

Các test **không mock backend** (trending/search/wishlist...). Hãy đảm bảo backend local đang chạy (mặc định `http://localhost:8080`).

### Gợi ý `data-testid` (để locator ổn định hơn)

Trong `src/pages/AuthPage.tsx` nên cân nhắc thêm:

- `data-testid="auth-email"` cho input email
- `data-testid="auth-password"` cho input password
- `data-testid="auth-name"` cho input name (register mode)
- `data-testid="auth-phone"` cho input phone (register mode)
- `data-testid="auth-submit"` cho nút submit
- `data-testid="auth-toggle-mode"` cho nút đổi Login/Register


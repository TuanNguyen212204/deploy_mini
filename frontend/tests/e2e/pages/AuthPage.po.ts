import type { Locator, Page } from '@playwright/test';

export class AuthPagePO {
  readonly page: Page;

  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly name: Locator;
  readonly phone: Locator;

  readonly submit: Locator;
  readonly toggleMode: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });

    // UI hiện chưa có data-testid; dùng locator bền dựa trên label + name attr.
    this.email = page.locator('input[name="email"]');
    this.password = page.locator('input[name="password"]');
    this.name = page.locator('input[name="name"]');
    this.phone = page.locator('input[name="phone"]');

    this.submit = page.getByRole('button', { name: /đăng nhập|tạo tài khoản/i });
    this.toggleMode = page.getByRole('button', { name: /đăng ký ngay|đăng nhập ngay/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async switchToRegister() {
    await this.page.getByRole('button', { name: /đăng ký ngay/i }).click();
  }

  async switchToLogin() {
    await this.page.getByRole('button', { name: /đăng nhập ngay/i }).click();
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async register(payload: { name: string; phone: string; email: string; password: string }) {
    await this.name.fill(payload.name);
    await this.phone.fill(payload.phone);
    await this.email.fill(payload.email);
    await this.password.fill(payload.password);
    await this.submit.click();
  }
}


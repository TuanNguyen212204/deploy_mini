import type { Locator, Page } from '@playwright/test';

export class AppHeaderPO {
  readonly page: Page;
  readonly header: Locator;
  readonly nav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.nav = this.header.getByRole('navigation');
  }

  navLink(name: string) {
    // Scope trong header/nav để tránh trùng link ở footer.
    return this.nav.getByRole('link', { name, exact: true });
  }

  get logoutButton() {
    return this.page.getByRole('button', { name: /^logout$/i });
  }
}


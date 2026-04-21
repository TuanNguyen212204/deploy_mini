import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { env } from '../config/env';

export type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export async function createBrowserSession(options?: { blockAssets?: boolean }): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless: env.headless });
  const context = await browser.newContext({
    userAgent: env.userAgent,
    locale: env.locale,
    viewport: { width: env.viewportWidth, height: env.viewportHeight },
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  if (options?.blockAssets) {
    await page.route('**/*', async (route) => {
      const type = route.request().resourceType();
      const url = route.request().url().toLowerCase();
      
      // Chặn thêm các script tracking/ads nặng nề của Cocolux
      const isTracking = url.includes('google-analytics') || 
                         url.includes('facebook.net') || 
                         url.includes('googletagmanager');

      if (['image', 'font', 'media', 'stylesheet'].includes(type) || isTracking) {
        await route.abort().catch(() => {});
        return;
      }
      await route.continue().catch(() => {});
    });
  }

  page.setDefaultTimeout(env.requestTimeoutMs);
  page.setDefaultNavigationTimeout(env.requestTimeoutMs);

  return { browser, context, page };
}

export async function closeBrowserSession(session?: Partial<BrowserSession>): Promise<void> {
  try {
    await session?.context?.close();
  } finally {
    await session?.browser?.close();
  }
}
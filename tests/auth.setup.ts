import { test as setup, expect } from '@playwright/test';
import { existsSync } from 'fs';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Logs in once and saves the session to .auth/user.json; every test reuses it.
 * Login itself is a precondition, not something under test (the challenge asks
 * to stay away from auth flows).
 *
 * Two modes:
 *  - PICSIO_EMAIL + PICSIO_PASSWORD in .env -> logs in through the form
 *  - npm run auth:manual                    -> opens a browser, you log in any way
 *                                              (e.g. "Sign in with Google"), session is saved
 */
// Tagged @smoke so the setup project still runs with `--grep @smoke`.
setup('authenticate @smoke', async ({ page }) => {
  setup.setTimeout(5 * 60_000);
  await page.route(/intercom/, (route) => route.abort());
  await page.goto('/login');

  const email = process.env.PICSIO_EMAIL;
  const password = process.env.PICSIO_PASSWORD;

  if (process.env.MANUAL_LOGIN || !email || !password) {
    setup.skip(!process.env.MANUAL_LOGIN && hasSavedSession(), 'Reusing saved session from .auth/user.json');
    console.log('\n>>> Log in to Pics.io in the opened browser window. Waiting up to 5 minutes...\n');
  } else {
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('#btnSubmit').click();
  }

  await page.waitForURL(/\/search/, { timeout: 5 * 60_000 });
  await expect(page.getByPlaceholder('Search all collections')).toBeVisible({ timeout: 60_000 });

  await page.context().storageState({ path: STORAGE_STATE });
});

function hasSavedSession(): boolean {
  return existsSync(STORAGE_STATE);
}

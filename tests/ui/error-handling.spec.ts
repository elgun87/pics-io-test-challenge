import { test, expect } from '../../src/fixtures/test';
import { SEARCH_TEXT } from '../../src/utils/testData';

/**
 * P2 — backend failures. Impossible to reproduce by hand on demand,
 * trivial with page.route(): the real server is never called.
 * Plan IDs: SS-11, SS-12
 */
test.describe('Saved searches — server errors', () => {
  test.beforeEach(async ({ page, searchPage, panel, saveDialog }) => {
    await page.route('**/savedSearches', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, json: { msg: 'Internal Server Error' } })
        : route.continue(),
    );

    await searchPage.open();
    await panel.openTab();
    await searchPage.searchFor(SEARCH_TEXT);
    await searchPage.saveSearchButton.click();
    await saveDialog.expectOpen();
  });

  test('SS-11 failed save does not leave a "ghost" item in the list', async ({
    page, saveDialog, panel, uniqueName,
  }) => {
    const name = uniqueName('err500');
    await saveDialog.fillName(name);
    await saveDialog.submit();

    await expect(page.locator('.Toastify__toast').filter({ hasText: 'added to' })).toHaveCount(0);
    await expect(panel.item(name)).toHaveCount(0);
  });

  test('SS-12 failed save shows an error message to the user', async ({
    page, saveDialog, uniqueName,
  }) => {
    test.info().annotations.push({
      type: 'known bug',
      description:
        'BUG-01 (same root cause): on 5xx the dialog closes without any message, ' +
        'so the user believes the search was saved. Marked test.fail() until fixed.',
    });
    test.fail();

    const name = uniqueName('err500');
    await saveDialog.fillName(name);
    await saveDialog.submit();

    // Expected: an error toast (the app uses react-toastify) or an inline error in the dialog
    const errorToast = page.locator('.Toastify__toast').filter({ hasNotText: 'added to' });
    await expect(errorToast.or(saveDialog.nameError).first()).toBeVisible({ timeout: 3_000 });
  });
});

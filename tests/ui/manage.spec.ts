import { test, expect } from '../../src/fixtures/test';
import { SEARCH_TEXT } from '../../src/utils/testData';

/**
 * P1 — managing existing saved searches.
 * Each test creates its own saved search through the API (fast, independent)
 * and the fixture deletes it afterwards.
 * Plan IDs: SS-04, SS-05, SS-06, SS-07
 */
test.describe('Saved searches — rename, delete, filter', () => {
  let name: string;

  test.beforeEach(async ({ api, searchPage, panel, uniqueName }) => {
    name = uniqueName('manage');
    await api.create(name, SEARCH_TEXT);
    await searchPage.open();
    await panel.openTab();
    await expect(panel.item(name)).toBeVisible();
  });

  test('SS-04 rename a saved search @smoke', async ({ page, api, panel }) => {
    const newName = `${name}-renamed`;

    const renameRequest = page.waitForResponse(
      (r) => /\/savedSearches\/[^/]+\/rename$/.test(r.url()) && r.request().method() === 'PUT',
    );
    await panel.rename(name, newName);
    expect((await renameRequest).status()).toBe(200);

    await expect(panel.item(newName)).toBeVisible();
    await expect(panel.item(name)).toHaveCount(0);

    // Renaming must not change the query itself
    const stored = await api.findByName(newName);
    expect(stored?.data.text).toBe(SEARCH_TEXT);

    await page.reload();
    await panel.openTab();
    await expect(panel.item(newName)).toBeVisible();
  });

  test('SS-05 delete a saved search after confirmation @smoke', async ({ page, api, panel }) => {
    await panel.startDelete(name);

    const deleteRequest = page.waitForResponse(
      (r) => /\/savedSearches\/[^/]+$/.test(r.url()) && r.request().method() === 'DELETE',
    );
    await panel.confirmDelete();
    expect((await deleteRequest).status()).toBe(200);

    await expect(panel.item(name)).toHaveCount(0);
    expect(await api.findByName(name)).toBeUndefined();

    await page.reload();
    await panel.openTab();
    await expect(panel.item(name)).toHaveCount(0);
  });

  test('SS-06 cancelling delete keeps the saved search', async ({ api, panel }) => {
    await panel.startDelete(name);
    await panel.cancelDelete();

    await expect(panel.item(name)).toBeVisible();
    expect(await api.findByName(name)).toBeDefined();
  });

  test('SS-07 filter the saved searches list by name', async ({ panel }) => {
    await panel.filterInput.fill(name);

    await expect(panel.item(name)).toBeVisible();
    // A default saved search that every trial account has must be filtered out
    await expect(panel.item('JPG images')).toBeHidden();

    await panel.filterInput.fill('');
    await expect(panel.item('JPG images')).toBeVisible();
  });
});

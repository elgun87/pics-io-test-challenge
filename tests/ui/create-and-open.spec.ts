import { test, expect } from '../../src/fixtures/test';
import { SEARCH_TEXT } from '../../src/utils/testData';

/**
 * P1 — the core value of the feature: what I save is exactly what I get back.
 * Plan IDs: SS-01, SS-02, SS-03
 */
test.describe('Saved searches — create and open', () => {
  test.beforeEach(async ({ searchPage, panel }) => {
    await searchPage.open();
    await panel.openTab();
  });

  test('SS-01 create a saved search from the current query @smoke', async ({
    page, api, searchPage, saveDialog, panel, uniqueName,
  }) => {
    const name = uniqueName('create');
    await searchPage.searchFor(SEARCH_TEXT);

    await searchPage.saveSearchButton.click();
    await saveDialog.expectOpen();
    await saveDialog.fillName(name);

    const saveRequest = page.waitForResponse(
      (r) => r.url().endsWith('/savedSearches') && r.request().method() === 'POST',
    );
    await saveDialog.submit();
    expect((await saveRequest).status()).toBe(201);

    // UI feedback
    await expect(saveDialog.root).toBeHidden();
    await expect(page.getByText(`"${name}" added to "Saved searches"`)).toBeVisible();
    await expect(panel.item(name)).toBeVisible();

    // What was really stored — a green UI is not enough if the query was lost
    const stored = await api.findByName(name);
    expect(stored, 'saved search exists in the API').toBeDefined();
    expect(stored!.data.text).toBe(SEARCH_TEXT);
  });

  test('SS-02 opening a saved search restores the query and the same results @smoke', async ({
    page, api, searchPage, panel, uniqueName,
  }) => {
    // Expected result: a normal search with the same text
    await searchPage.searchFor(SEARCH_TEXT);
    const expectedCount = await searchPage.resultsCountText();
    await searchPage.clearSearch();

    // Arrange through the API — this test is about opening, not creating
    const name = uniqueName('open');
    await api.create(name, SEARCH_TEXT);
    await page.reload();
    await panel.openTab();

    await panel.openSavedSearch(name);

    await expect(panel.item(name)).toHaveAttribute('aria-selected', 'true');
    await expect(searchPage.searchInput).toHaveValue(SEARCH_TEXT);
    await expect(page).toHaveURL(new RegExp(`[?&]text=${SEARCH_TEXT}`));
    await expect(searchPage.resultsCounter).toHaveText(expectedCount);
  });

  test('SS-03 saved search persists after page reload', async ({
    page, searchPage, saveDialog, panel, uniqueName,
  }) => {
    const name = uniqueName('persist');
    await searchPage.searchFor(SEARCH_TEXT);
    await searchPage.saveSearchButton.click();
    await saveDialog.fillName(name);
    await saveDialog.submit();
    await expect(panel.item(name)).toBeVisible();

    await page.reload();
    await panel.openTab();

    await expect(panel.item(name)).toBeVisible();
  });
});

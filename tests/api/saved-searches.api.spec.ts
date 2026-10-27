import { test, expect } from '../../src/fixtures/test';
import { SEARCH_TEXT, MAX_NAME_LENGTH } from '../../src/utils/testData';

/**
 * API contract of /savedSearches — fast checks that localise a bug
 * (backend vs. UI) and cover the security case.
 * Plan IDs: SS-13 .. SS-16
 */
test.describe('Saved searches API', () => {
  test('SS-13 create, read and delete round trip @smoke', async ({ api, uniqueName }) => {
    const name = uniqueName('api');
    const created = await api.create(name, SEARCH_TEXT);

    expect(created).toMatchObject({ name, data: { text: SEARCH_TEXT } });
    expect(created._id).toMatch(/^[0-9a-f]{24}$/);

    expect((await api.findByName(name))?._id).toBe(created._id);

    await api.delete(created._id);
    expect(await api.findByName(name)).toBeUndefined();
  });

  const invalidNames = [
    { title: 'empty name', name: '', status: 400 },
    { title: 'spaces only', name: '   ', status: 400 },
    { title: `name longer than ${MAX_NAME_LENGTH} chars`, name: 'autotest-'.padEnd(MAX_NAME_LENGTH + 1, 'x'), status: 400 },
  ];
  for (const { title, name, status } of invalidNames) {
    test(`SS-14 rejects ${title} with ${status}`, async ({ page }) => {
      const response = await page.request.post('/savedSearches', {
        data: { name, data: { text: SEARCH_TEXT }, shared: true },
      });
      expect(response.status()).toBe(status);
    });
  }

  test('SS-15 rejects a duplicate name in the same location with 409', async ({ page, api, uniqueName }) => {
    const name = uniqueName('dup');
    await api.create(name, SEARCH_TEXT);

    const response = await page.request.post('/savedSearches', {
      data: { name, data: { text: SEARCH_TEXT }, shared: true },
    });
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({ success: false });
  });

  test('SS-16 HTML in the name is not stored or executed (XSS)', async ({ page, api, searchPage, panel, uniqueName }) => {
    const base = uniqueName('xss');
    const created = await api.create(`${base}<img src=x onerror="window.__xss=1">`, SEARCH_TEXT);

    expect(created.name).not.toContain('<img');

    await searchPage.open();
    await panel.openTab();
    await expect(panel.item(created.name.trim())).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });
});

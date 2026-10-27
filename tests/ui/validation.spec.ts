import { test, expect } from '../../src/fixtures/test';
import { SEARCH_TEXT, MAX_NAME_LENGTH } from '../../src/utils/testData';

/**
 * P2 — name validation in the "Create saved search" dialog.
 * Plan IDs: SS-08, SS-09, SS-10
 */
test.describe('Saved searches — name validation', () => {
  test.beforeEach(async ({ searchPage, panel, saveDialog }) => {
    await searchPage.open();
    await panel.openTab();
    await searchPage.searchFor(SEARCH_TEXT);
    await searchPage.saveSearchButton.click();
    await saveDialog.expectOpen();
  });

  // Data-driven: same steps, several inputs
  const blankNames = [
    { title: 'empty', value: '' },
    { title: 'spaces only', value: '   ' },
  ];
  for (const { title, value } of blankNames) {
    test(`SS-08 Ok is disabled when the name is ${title}`, async ({ saveDialog }) => {
      await saveDialog.fillName(value);
      await expect(saveDialog.okButton).toBeDisabled();
    });
  }

  test('SS-09 duplicate name shows an inline error and keeps the dialog open', async ({
    api, saveDialog, uniqueName,
  }) => {
    const name = uniqueName('dup');
    await api.create(name, SEARCH_TEXT);

    await saveDialog.fillName(name);
    await saveDialog.submit();

    await expect(saveDialog.nameError).toHaveText(
      'A saved search with this name already exists in this location. Please choose another name.',
    );
    await expect(saveDialog.root).toBeVisible();
    expect((await api.list()).filter((s) => s.name === name)).toHaveLength(1);
  });

  test('SS-10 name longer than the limit shows an error instead of silently failing', async ({
    page, api, saveDialog, uniqueName,
  }) => {
    test.info().annotations.push({
      type: 'known bug',
      description:
        'BUG-01: UI allows names > 50 chars; server answers 400 and the dialog just closes. ' +
        'Nothing is saved and the user sees no error. Marked test.fail() until fixed.',
    });
    test.fail();

    const tooLong = uniqueName('long').padEnd(MAX_NAME_LENGTH + 1, 'x');
    await saveDialog.fillName(tooLong);

    const saveRequest = page.waitForResponse(
      (r) => r.url().endsWith('/savedSearches') && r.request().method() === 'POST',
    );
    await saveDialog.submit();
    expect((await saveRequest).status()).toBe(400);
    expect(await api.findByName(tooLong)).toBeUndefined();

    // Expected behaviour (currently fails): the user is told why it was not saved
    await expect(saveDialog.root).toBeVisible({ timeout: 3_000 });
    await expect(saveDialog.nameError).toBeVisible();
  });
});

import { test as base, expect } from '@playwright/test';
import { SavedSearchesApi } from '../api/SavedSearchesApi';
import { SearchPage } from '../pages/SearchPage';
import { SaveSearchDialog } from '../pages/SaveSearchDialog';
import { SavedSearchesPanel } from '../pages/SavedSearchesPanel';

/** Every saved search created by the suite starts with this prefix, so cleanup can't touch real data. */
export const TEST_PREFIX = 'autotest-';

type Fixtures = {
  api: SavedSearchesApi;
  searchPage: SearchPage;
  saveDialog: SaveSearchDialog;
  panel: SavedSearchesPanel;
  /** Returns a unique, readable name for this test, e.g. "autotest-rename-lq3k9a". */
  uniqueName: (label: string) => string;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    // Third-party chat widget (Intercom) pops up over the UI and makes clicks flaky.
    await page.route(/intercom/, (route) => route.abort());
    await use(page);
  },

  // page.request shares cookies with the logged-in browser context.
  // auto: true -> cleanup runs after every test, also tests that only use the UI
  // and tests that failed half-way.
  api: [
    async ({ page }, use) => {
      const api = new SavedSearchesApi(page.request);
      await use(api);
      await api.deleteByPrefix(TEST_PREFIX);
    },
    { auto: true },
  ],

  searchPage: async ({ page }, use) => use(new SearchPage(page)),
  saveDialog: async ({ page }, use) => use(new SaveSearchDialog(page)),
  panel: async ({ page }, use) => use(new SavedSearchesPanel(page)),

  uniqueName: async ({}, use) => {
    await use((label) => `${TEST_PREFIX}${label}-${Date.now().toString(36)}`);
  },
});

export { expect };

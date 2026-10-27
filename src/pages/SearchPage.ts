import { Locator, Page, expect } from '@playwright/test';

/** The main /search screen: search bar, results counter and asset grid. */
export class SearchPage {
  readonly searchInput: Locator;
  readonly resultsCounter: Locator;
  readonly assets: Locator;
  /**
   * The "Save this search" icon button has no aria-label or test id
   * (accessibility finding, see TESTING_PLAN.md), so a scoped CSS selector is the
   * most stable option. "addMore" is the neighbouring "Add more filters" button.
   */
  readonly saveSearchButton: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByPlaceholder('Search all collections');
    this.resultsCounter = page.locator('.searchHeader-counter');
    this.assets = page.locator('.catalogItem');
    this.saveSearchButton = page.locator(
      '.searchFilters__controls .searchFilters__iconBtn:not(.addMore)',
    );
  }

  async open(): Promise<void> {
    await this.page.goto('/search');
    // The app shows "Loading user data..." first; the search bar means it is ready.
    await expect(this.searchInput).toBeVisible({ timeout: 45_000 });
  }

  async searchFor(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.searchInput.press('Enter');
    await expect(this.page).toHaveURL(new RegExp(`[?&]text=${encodeURIComponent(text)}`));
    await expect(this.resultsCounter).toBeVisible();
  }

  async clearSearch(): Promise<void> {
    await this.page.getByTestId('btnResetSearchValue').click();
    await expect(this.searchInput).toHaveValue('');
  }

  /** Text like "2 assets" — used to compare result sets between two ways of searching. */
  async resultsCountText(): Promise<string> {
    return (await this.resultsCounter.innerText()).trim();
  }
}

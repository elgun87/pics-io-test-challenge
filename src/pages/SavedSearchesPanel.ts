import { Locator, Page, expect } from '@playwright/test';

/** Left sidebar "Searches" tab with the Team / Personal saved-search trees. */
export class SavedSearchesPanel {
  readonly tabButton: Locator;
  readonly filterInput: Locator;
  readonly deleteDialog: Locator;

  constructor(private readonly page: Page) {
    this.tabButton = page.locator('#button-search');
    this.filterInput = page.getByPlaceholder('Search in saved searches');
    this.deleteDialog = page.locator('.simpleDialog').filter({ hasText: 'Delete saved search?' });
  }

  /** The panel is a real ARIA tree (role="tree" / "treeitem"), so items are found by role + name. */
  item(name: string): Locator {
    return this.page.getByRole('treeitem', { name, exact: true });
  }

  /** Opens the "Searches" tab. The app remembers the last tab, so only click when needed. */
  async openTab(): Promise<void> {
    if (!(await this.filterInput.isVisible())) {
      await this.tabButton.click();
    }
    await expect(this.filterInput).toBeVisible();
  }

  async openSavedSearch(name: string): Promise<void> {
    const item = this.item(name);
    await item.scrollIntoViewIfNeeded();
    await item.getByText(name, { exact: true }).click();
  }

  /** Item action buttons (favorite / move / rename / delete) only appear on hover. */
  private async clickItemAction(name: string, testId: string): Promise<void> {
    const item = this.item(name);
    await item.scrollIntoViewIfNeeded();
    await item.hover();
    await item.getByTestId(testId).click();
  }

  /** Inline rename: the name turns into a pre-selected input, Enter confirms. */
  async rename(oldName: string, newName: string): Promise<void> {
    await this.clickItemAction(oldName, 'savedSearchRename');
    const input = this.page.locator('li[role="treeitem"] input:focus');
    await expect(input).toHaveValue(oldName);
    await input.fill(newName);
    await input.press('Enter');
  }

  /** Clicks the trash icon and returns once the confirmation dialog is shown. */
  async startDelete(name: string): Promise<void> {
    await this.clickItemAction(name, 'savedSearchDelete');
    await expect(this.deleteDialog).toBeVisible();
    await expect(this.deleteDialog).toContainText(name);
  }

  async confirmDelete(): Promise<void> {
    await this.deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(this.deleteDialog).toBeHidden();
  }

  async cancelDelete(): Promise<void> {
    await this.deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(this.deleteDialog).toBeHidden();
  }
}

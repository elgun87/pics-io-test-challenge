import { Locator, Page, expect } from '@playwright/test';

/** "Create saved search" modal opened from the search toolbar. */
export class SaveSearchDialog {
  readonly root: Locator;
  readonly nameInput: Locator;
  readonly okButton: Locator;
  readonly cancelButton: Locator;
  readonly shareCheckbox: Locator;
  readonly nameError: Locator;

  constructor(page: Page) {
    this.root = page.locator('.saveSearchHostDialog');
    this.nameInput = this.root.getByPlaceholder('Please enter the name');
    this.okButton = this.root.getByRole('button', { name: 'Ok', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel', exact: true });
    this.shareCheckbox = this.root.getByTestId('saveSearchShare');
    this.nameError = this.root.locator('.UIInput__error');
  }

  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.root).toContainText('Create saved search');
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async submit(): Promise<void> {
    await this.okButton.click();
  }
}

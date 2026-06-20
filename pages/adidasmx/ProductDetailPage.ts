import { Page } from '@playwright/test';
import { BasePage } from '../shared/BasePage';

export class ProductDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get productTitle() {
    return this.page.getByRole('heading', { level: 1 }).first();
  }

  private get price() {
    return this.page.getByText(/\$\s?[\d,]+/).first();
  }

  async isProductNameVisible(): Promise<boolean> {
    await this.productTitle.waitFor({ state: 'visible', timeout: 15000 });
    return this.productTitle.isVisible();
  }

  async isPriceVisible(): Promise<boolean> {
    return this.price.isVisible();
  }
}

import { Page } from '@playwright/test';
import { BasePage } from '../shared/BasePage';

export class InventoryPage extends BasePage {
  private readonly productItems = '.inventory_item';
  private readonly productName = '.inventory_item_name';
  private readonly cartBadge = '.shopping_cart_badge';
  private readonly addToCartButton = (name: string) =>
    `//div[text()="${name}"]/ancestor::div[@class="inventory_item"]//button`;

  constructor(page: Page) {
    super(page);
  }

  async getProductNames(): Promise<string[]> {
    return this.page.locator(this.productName).allInnerTexts();
  }

  async addToCart(productName: string) {
    await this.page.locator(this.addToCartButton(productName)).click();
  }

  async getCartCount(): Promise<number> {
    const badge = this.page.locator(this.cartBadge);
    const text = await badge.innerText();
    return parseInt(text, 10);
  }

  async isLoaded(): Promise<boolean> {
    return this.page.locator(this.productItems).first().isVisible();
  }
}

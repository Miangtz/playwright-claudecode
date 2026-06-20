import { Page } from '@playwright/test';
import { BasePage } from '../shared/BasePage';

export class SearchResultsPage extends BasePage {
  // Las cards de producto siempre enlazan a una URL que termina en .html
  private readonly productLinks = 'main a[href*=".html"]';

  constructor(page: Page) {
    super(page);
  }

  async waitForResults() {
    // Cada término navega a una URL distinta: categoría (/running?grid=true),
    // landing de marca (/ultraboost) o búsqueda libre (/search?q=...).
    // Lo único estable es que la URL deja de ser la home; esperar eso evita
    // contar los productos de los carruseles de la página de inicio.
    await this.page.waitForURL((url) => url.pathname !== '/', { timeout: 15000 });
    await this.page.locator(this.productLinks).first().waitFor({ state: 'visible', timeout: 15000 });
  }

  async hasResults(): Promise<boolean> {
    const count = await this.page.locator(this.productLinks).count();
    return count > 0;
  }

  async clickFirstProduct() {
    await this.page.locator(this.productLinks).first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}

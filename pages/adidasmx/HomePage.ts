import { Page } from '@playwright/test';
import { BasePage } from '../shared/BasePage';

export class HomePage extends BasePage {
  // Locators verificados con el snapshot de accesibilidad (2026-06-10).
  // adidas.mx bloquea navegadores headless con 403: correr siempre en modo headed
  // (configurado en el proyecto "adidas-headed" de playwright.config.ts).
  constructor(page: Page) {
    super(page);
  }

  private get cookieAcceptButton() {
    return this.page.getByRole('button', { name: 'Aceptar el seguimiento' });
  }

  private get logo() {
    return this.page.getByRole('link', { name: 'tienda online' });
  }

  private get searchBox() {
    return this.page.getByRole('textbox', { name: 'Buscar' });
  }

  private get mainNav() {
    return this.page.getByRole('list', { name: 'Main Navigation' });
  }

  // El botón del header abre un menú flotante sin navegar, por eso se usa
  // el enlace de la home que sí lleva a /account-login (verificado 2026-06-10)
  private get loginLink() {
    return this.page.getByRole('link', { name: /Regístrate o inicia sesión/i });
  }

  async goToHome() {
    // domcontentloaded en vez del "load" default: la home carga decenas de
    // recursos de terceros y si uno se cuelga el goto excede el timeout
    // aunque la página ya esté usable. Los waits de elementos hacen el resto.
    await this.page.goto('https://www.adidas.mx', { waitUntil: 'domcontentloaded' });
    await this.dismissCookiesIfVisible();
  }

  private async dismissCookiesIfVisible() {
    try {
      await this.cookieAcceptButton.waitFor({ state: 'visible', timeout: 7000 });
      await this.cookieAcceptButton.click();
    } catch {
      // El banner no siempre aparece; si no está, seguimos
    }
  }

  async isLogoVisible(): Promise<boolean> {
    return this.logo.isVisible();
  }

  async isSearchBarVisible(): Promise<boolean> {
    return this.searchBox.isVisible();
  }

  async search(term: string) {
    await this.searchBox.fill(term);
    await this.searchBox.press('Enter');
  }

  async goToSection(sectionName: string) {
    await this.mainNav.getByRole('link', { name: sectionName }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToLogin() {
    await this.loginLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}

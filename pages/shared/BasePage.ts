import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string = '/') {
    // domcontentloaded en vez del "load" default: si un recurso tarda en bajar
    // el goto excede el timeout aunque la página ya esté usable (fallos del 2026-06-10)
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async waitForLoad() {
    // 'networkidle' espera 500ms sin tráfico de red y nunca llega cuando el
    // sitio está lento o hay analytics activos (fallos del 2026-06-10).
    // 'domcontentloaded' + las esperas automáticas de los expect() es suficiente.
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}

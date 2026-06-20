import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  // featuresRoot evita que la ruta "features/" se repita dentro de .features-gen,
  // así el árbol del Test Explorer queda más corto: .features-gen/adidasmx/...
  featuresRoot: 'features',
  features: 'features/**/*.feature',
  steps: ['steps/**/*.ts', 'hooks/*.ts', 'fixtures/index.ts'],
});

export default defineConfig({
  testDir,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // El reporter del dashboard solo se suma cuando la corrida viene del tablero
  // (esa variable la define dashboard/server.js). Un `npm test` normal no cambia.
  reporter: process.env.DASHBOARD_EVENTS_URL
    ? [['html', { open: 'never' }], ['list'], ['./dashboard/reporter.ts']]
    : [['html'], ['list']],
  use: {
    baseURL: 'https://www.saucedemo.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /adidasmx/,
    },
    {
      // adidas.mx bloquea navegadores headless con 403 (protección anti-bots).
      // En modo headed la página carga normal, por eso este proyecto separado.
      name: 'adidas-headed',
      use: { ...devices['Desktop Chrome'], headless: false },
      testMatch: /adidasmx/,
    },
  ],
});

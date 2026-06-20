import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures';

const { Before, After } = createBdd(test);

// Se ejecuta antes de cada escenario.
// Las screenshots en fallo se capturan automáticamente via playwright.config.ts (screenshot: 'only-on-failure').
Before(async ({}) => {});

// Se ejecuta al terminar cada escenario: cierra la página para no dejar
// ventanas del navegador abiertas. Solo se cierra cuando el escenario pasó;
// si falló, la página debe seguir abierta para que Playwright capture la
// screenshot del fallo (screenshot: 'only-on-failure').
After(async ({ page, $testInfo }) => {
  if ($testInfo.status === 'passed') {
    await page.close();
  }
});

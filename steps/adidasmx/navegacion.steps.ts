import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from '../../fixtures';

const { Given, When, Then } = createBdd(test);

Given('que visito la página de inicio de adidas México', async ({ adidasHomePage }) => {
  await adidasHomePage.goToHome();
});

Given('que estoy en la página de inicio de adidas México', async ({ adidasHomePage }) => {
  await adidasHomePage.goToHome();
});

Then('el logo de adidas está visible', async ({ adidasHomePage }) => {
  expect(await adidasHomePage.isLogoVisible()).toBe(true);
});

Then('la barra de búsqueda está visible', async ({ adidasHomePage }) => {
  expect(await adidasHomePage.isSearchBarVisible()).toBe(true);
});

When('hago clic en {string} del menú principal', async ({ adidasHomePage }, sectionName: string) => {
  await adidasHomePage.goToSection(sectionName);
});

Then('la URL incluye {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(path.replace(/[/]/g, '\\/')));
});

When('hago clic en el enlace para iniciar sesión', async ({ adidasHomePage }) => {
  await adidasHomePage.goToLogin();
});

Then('la URL incluye información de la cuenta', async ({ page }) => {
  await expect(page).toHaveURL(/login|cuenta|mi-cuenta|account/i);
});

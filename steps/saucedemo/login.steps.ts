import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from '../../fixtures';

const { Given, When, Then } = createBdd(test);

Given('que estoy en la página de login', async ({ loginPage }) => {
  await loginPage.navigate('/');
  await loginPage.waitForLoad();
});

When('ingreso el usuario {string} y contraseña {string}', async ({ loginPage }, username: string, password: string) => {
  await loginPage.login(username, password);
});

Then('debería ver la página de productos', async ({ page }) => {
  await expect(page).toHaveURL(/inventory/);
});

Then('debería ver el mensaje de error {string}', async ({ loginPage }, message: string) => {
  const error = await loginPage.getErrorMessage();
  expect(error).toContain(message);
});

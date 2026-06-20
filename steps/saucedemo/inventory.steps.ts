import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from '../../fixtures';

const { Given, When, Then } = createBdd(test);

Given('que ingresé como {string} con contraseña {string}', async ({ loginPage, inventoryPage }, username: string, password: string) => {
  await loginPage.navigate('/');
  await loginPage.login(username, password);
  await inventoryPage.waitForLoad();
});

When('agrego el producto {string} al carrito', async ({ inventoryPage }, productName: string) => {
  await inventoryPage.addToCart(productName);
});

Then('debería ver al menos un producto en la lista', async ({ inventoryPage }) => {
  const products = await inventoryPage.getProductNames();
  expect(products.length).toBeGreaterThan(0);
});

Then('el contador del carrito debería mostrar {string}', async ({ inventoryPage }, expected: string) => {
  const count = await inventoryPage.getCartCount();
  expect(count).toBe(parseInt(expected, 10));
});

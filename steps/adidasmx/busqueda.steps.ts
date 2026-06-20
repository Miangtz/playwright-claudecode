import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from '../../fixtures';

const { Given, When, Then } = createBdd(test);

Given('que busqué {string} en adidas México', async ({ adidasHomePage, adidasSearchPage }, term: string) => {
  await adidasHomePage.goToHome();
  await adidasHomePage.search(term);
  await adidasSearchPage.waitForResults();
});

When('busco el término {string}', async ({ adidasHomePage, adidasSearchPage }, term: string) => {
  await adidasHomePage.search(term);
  await adidasSearchPage.waitForResults();
});

Then('veo una lista de productos en los resultados', async ({ adidasSearchPage }) => {
  expect(await adidasSearchPage.hasResults()).toBe(true);
});

When('hago clic en el primer producto de los resultados', async ({ adidasSearchPage }) => {
  await adidasSearchPage.clickFirstProduct();
});

Then('veo el nombre del producto y su precio', async ({ adidasProductPage }) => {
  expect(await adidasProductPage.isProductNameVisible()).toBe(true);
  expect(await adidasProductPage.isPriceVisible()).toBe(true);
});

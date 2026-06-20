import { test as base } from 'playwright-bdd';
import { LoginPage } from '../pages/saucedemo/LoginPage';
import { InventoryPage } from '../pages/saucedemo/InventoryPage';
import { HomePage } from '../pages/adidasmx/HomePage';
import { SearchResultsPage } from '../pages/adidasmx/SearchResultsPage';
import { ProductDetailPage } from '../pages/adidasmx/ProductDetailPage';

type SauceDemoFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
};

type AdidasMxFixtures = {
  adidasHomePage: HomePage;
  adidasSearchPage: SearchResultsPage;
  adidasProductPage: ProductDetailPage;
};

export const test = base.extend<SauceDemoFixtures & AdidasMxFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  adidasHomePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  adidasSearchPage: async ({ page }, use) => {
    await use(new SearchResultsPage(page));
  },
  adidasProductPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
});

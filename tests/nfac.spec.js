import { test, expect } from '@playwright/test';

test('la página tiene el título correcto', async ({ page }) => {
  await page.goto('http://localhost:8744');

  await expect(page).toHaveTitle(/Nunca Fuiste al Cine/);
});

test('se ve el horario en vivo en el hero', async ({ page }) => {
  await page.goto('http://localhost:8744');

  await expect(page.getByTestId('hero-schedule')).toContainText('Sábados de 14 a 16hs');
});

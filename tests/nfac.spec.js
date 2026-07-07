import { test, expect } from '@playwright/test';

test('la página tiene el título correcto', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Nunca Fuiste al Cine/);
});

test('se ve el horario en vivo en el hero', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('hero-schedule')).toContainText('Sábados de 14 a 16hs');
});

test.describe('menú mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('el botón abre y cierra el menú, actualizando aria-expanded', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Abrir menú' });
    const menu = page.locator('#navMenu');

    await expect(menu).not.toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
  });
});

test('la página de columnas muestra los 6 segmentos con sus columnistas', async ({ page }) => {
  await page.goto('/columnas.html');
  const columnas = page.locator('#columnas .column-item');

  await expect(columnas).toHaveCount(6);
  await expect(columnas.filter({ hasText: 'Rockumentales' })).toContainText('Gonza Penas');
  await expect(columnas.filter({ hasText: 'Premisas Falsas' })).toContainText('Santi Kahn');
});

test('los planes de suscripción muestran los 4 montos fijos', async ({ page }) => {
  await page.goto('/');
  const plans = page.locator('.plans-monthly .plan-card:not(.plan-card-custom)');

  await expect(plans).toHaveCount(4);
  await expect(page.locator('.plan-card-espectador')).toContainText('$5.000');
  await expect(page.locator('.plan-card-director')).toContainText('$20.000');
});

test('las preguntas frecuentes se pueden expandir', async ({ page }) => {
  await page.goto('/preguntas-frecuentes.html');
  const firstFaq = page.locator('.faq-item').first();

  await expect(firstFaq).not.toHaveAttribute('open', '');
  await firstFaq.locator('summary').click();
  await expect(firstFaq).toHaveAttribute('open', '');
});

test('el footer linkea a Instagram', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.footer-social-instagram')).toHaveAttribute(
    'href',
    'https://www.instagram.com/nuncafuistecine/'
  );
});

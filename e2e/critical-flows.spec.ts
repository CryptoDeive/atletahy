import { expect, test } from '@playwright/test';
import { validGeneratedTrainingPlan } from '../src/test/planTestUtils';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      await route.continue();
      return;
    }
    await route.abort('blockedbyclient');
  });
});

test('auth: a protected route redirects to the public home without a session', async ({ page }) => {
  await page.goto('/app/trainings');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Prepara tu HYROX con un plan que se adapta a ti/i })).toBeVisible();
});

test('demo: public entry opens the private training experience locally', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver demo' }).click();

  await expect(page).toHaveURL('/demo/trainings');
  await expect(page.getByRole('heading', { name: /Registro del entrenamiento/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /principal/i }).getByRole('link', { name: 'Entrenamientos' })).toHaveAttribute('aria-current', 'page');
});

test('onboarding: an isolated guest draft survives a reload', async ({ page }) => {
  await page.goto('/demo/onboarding');
  await page.getByLabel('Fecha de competición').fill('2026-11-22');
  await page.getByLabel('Objetivo principal').selectOption('terminar');

  await page.reload();

  await expect(page.getByLabel('Fecha de competición')).toHaveValue('2026-11-22');
  await expect(page.getByLabel('Objetivo principal')).toHaveValue('terminar');
});

test('plan: a locally persisted active plan loads without calling AI', async ({ page }) => {
  await page.addInitScript((plan) => {
    localStorage.setItem('atletahy:guest:training-plans', JSON.stringify({
      'e2e-plan': {
        id: 'e2e-plan',
        title: plan.title,
        status: 'active',
        targetRaceDate: plan.targetRaceDate,
        generatedAt: plan.generatedAt,
        inputSnapshotJson: {},
        planJson: plan,
        createdAt: plan.generatedAt,
        updatedAt: plan.generatedAt,
      },
    }));
  }, validGeneratedTrainingPlan);

  await page.goto('/demo/trainings');

  await expect(page.getByRole('heading', { name: validGeneratedTrainingPlan.title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Regenerar plan' })).toBeVisible();
});

test('training: a workout log persists after reload', async ({ page }) => {
  await page.goto('/demo/trainings');
  await expect(page.getByRole('region', { name: 'Generador de plan IA' })).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: /Abrir registro del entrenamiento/i }).click();
  await page.getByLabel('Estado del entrenamiento').selectOption('completado');
  await page.getByLabel(/Duraci.n \(min\)/i).fill('62');
  await page.getByLabel(/RPE sesi.n \(1-10\)/i).fill('8');
  await page.getByLabel('Porcentaje completado').fill('95');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByText('Registro guardado')).toBeVisible();

  await page.reload();
  await expect(page.getByText('62 min')).toBeVisible();
  await expect(page.getByText('RPE 8')).toBeVisible();
  await expect(page.getByText('95% completado')).toBeVisible();
});

test('tests: a SkiErg result persists after reload', async ({ page }) => {
  await page.goto('/demo/tests/ski-2k');
  await page.getByLabel('Fecha').fill('2026-07-15');
  await page.getByLabel('Tiempo total').fill('7:40');
  await page.getByLabel('Damper').fill('6');
  await page.getByRole('button', { name: 'Guardar resultado' }).click();
  await expect(page.getByText('Resultado guardado')).toBeVisible();

  await page.reload();
  await expect(page.getByText('2026-07-15')).toBeVisible();
  await expect(page.getByText('7:40').first()).toBeVisible();
});

test('profile: a typed value outside the combobox list cannot be announced as saved', async ({ page }) => {
  await page.goto('/demo/profile');
  const height = page.getByRole('combobox', { name: 'Altura (cm)' });
  await height.fill('999');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(height).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/Selecciona una altura válida/i).first()).toBeVisible();
  await expect(page.getByText('Cambios guardados')).toHaveCount(0);

  await height.click();
  await height.fill('180');
  const height180 = page.getByRole('option', { name: '180 cm', exact: true });
  await expect(height180).toBeVisible();
  await height180.click();
  await expect(height).toHaveValue('180 cm');
  await page.getByRole('combobox', { name: 'Categoría HYROX' }).selectOption('women_open');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados')).toBeVisible();
});

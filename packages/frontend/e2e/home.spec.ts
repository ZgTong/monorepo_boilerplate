import { expect, test } from '@playwright/test';

test('home page loads without errors', async ({ page }) => {
    // Uncaught exceptions and console errors usually mean broken hydration or a missing
    // asset. The component test cannot see either, because it never loads the built bundle.
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Monorepo Boilerplate');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Monorepo Boilerplate' })
    ).toBeVisible();

    // The heading is in the static HTML, so it is visible before React hydrates, and
    // hydration errors would be logged after the assertion below. Wait until the page has
    // stopped loading chunks. Playwright discourages networkidle for assertions about the
    // UI; here it only delays the error check. Replace it with an explicit hydration
    // signal once there is a client component to set one.
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
});

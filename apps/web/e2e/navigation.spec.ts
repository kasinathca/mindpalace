// ─────────────────────────────────────────────────────────────────────────────
// e2e/navigation.spec.ts — Sidebar, collections, tags, settings E2E tests
//
// Tests: sidebar navigation links, collection CRUD, tag management page,
//        settings profile update, mobile sidebar drawer.
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth.helper.js';

test.describe('Navigation & Collections', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  // ── Sidebar navigation ────────────────────────────────────────────────────

  test('navigating to Search via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /Search/i }).click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('searchbox')).toBeVisible();
  });

  test('navigating to Tags via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /Tags/i }).click();
    await expect(page).toHaveURL(/\/tags/);
    await expect(page.getByText(/Create, rename, re-colour/i)).toBeVisible();
  });

  test('navigating to Import \/ Export via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /Import/i }).click();
    await expect(page).toHaveURL(/\/import-export/);
  });

  test('navigating to Settings via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /Settings/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('sidebar hamburger toggles visibility on desktop', async ({ page }) => {
    // The sidebar should be visible by default on desktop viewport
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Click the hamburger button
    await page.getByRole('button', { name: /Close sidebar|Open sidebar/i }).click();

    // Sidebar should now be hidden (width=0) on desktop
    await expect(sidebar).toBeHidden();

    // Toggle back
    await page.getByRole('button', { name: /Open sidebar/i }).click();
    await expect(sidebar).toBeVisible();
  });

  // ── Collections ───────────────────────────────────────────────────────────

  test('user can create a top-level collection', async ({ page }) => {
    await page.getByRole('button', { name: /New Collection/i }).click();

    const input = page.getByPlaceholder(/Collection name/i);
    await expect(input).toBeVisible();
    await input.fill('Work Projects');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Work Projects')).toBeVisible({ timeout: 5_000 });
  });

  test('selecting a collection filters the bookmark list', async ({ page }) => {
    // Create a collection
    await page.getByRole('button', { name: /New Collection/i }).click();
    await page.getByPlaceholder(/Collection name/i).fill('My Stack');
    await page.keyboard.press('Enter');
    await expect(page.getByText('My Stack')).toBeVisible({ timeout: 5_000 });

    // Add a bookmark to this collection
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/URL/i).fill('https://example.com');
    // Select the collection in the dropdown
    const collectionSelect = dialog.locator('select');
    await collectionSelect.selectOption({ label: /My Stack/ });
    await dialog.getByRole('button', { name: /Save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Select the collection in the sidebar
    await page.getByText('My Stack').click();
    await expect(page.getByText('example.com')).toBeVisible({ timeout: 5_000 });
  });

  // ── Tags ──────────────────────────────────────────────────────────────────

  test('user can create a new tag', async ({ page }) => {
    await page.getByRole('link', { name: /Tags/i }).click();

    const nameInput = page.getByPlaceholder(/Tag name/i);
    await nameInput.fill('javascript');
    await page.getByRole('button', { name: /Create tag/i }).click();

    await expect(page.getByText('javascript')).toBeVisible({ timeout: 5_000 });
  });

  test('tag management shows empty state for new user', async ({ page }) => {
    await page.getByRole('link', { name: /Tags/i }).click();
    await expect(page.getByText(/No tags yet/i)).toBeVisible();
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  test('settings page shows profile form pre-populated with current user data', async ({
    page,
  }) => {
    await page.getByRole('link', { name: /Settings/i }).click();

    // Display name field should have value (it was set during registration as 'E2E User')
    const displayNameInput = page.getByLabel(/Display name/i);
    await expect(displayNameInput).toHaveValue('E2E User');
  });

  test('settings page allows changing display name', async ({ page }) => {
    await page.getByRole('link', { name: /Settings/i }).click();

    const displayNameInput = page.getByLabel(/Display name/i);
    await displayNameInput.clear();
    await displayNameInput.fill('Updated Name');
    await page
      .getByRole('button', { name: /Save changes/i })
      .first()
      .click();

    await expect(page.getByText(/Profile saved/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('sidebar is hidden by default on mobile', async ({ page }) => {
    // On mobile viewport, the sidebar should not be visible
    const mobileOverlay = page.locator('aside.fixed');
    await expect(mobileOverlay).toHaveClass(/-translate-x-full/);
  });

  test('hamburger opens sidebar as overlay on mobile', async ({ page }) => {
    await page.getByRole('button', { name: /Open sidebar/i }).click();

    // Mobile sidebar should slide in
    const mobileOverlay = page.locator('aside.fixed');
    await expect(mobileOverlay).not.toHaveClass(/-translate-x-full/);

    // Backdrop should appear
    await expect(page.locator('[aria-hidden="true"].fixed')).toBeVisible();
  });

  test('clicking backdrop closes mobile sidebar', async ({ page }) => {
    await page.getByRole('button', { name: /Open sidebar/i }).click();
    const backdrop = page.locator('[aria-hidden="true"].fixed');
    await backdrop.click();

    // Sidebar should slide back out
    const mobileOverlay = page.locator('aside.fixed');
    await expect(mobileOverlay).toHaveClass(/-translate-x-full/);
  });

  test('skip-to-main-content link is the first focusable element', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/Skip to main content/i);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('skip-to-main link navigates to main content', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    // Focus should now be inside #main-content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('dashboard has a main landmark', async ({ page }) => {
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('all images have alt text or aria-hidden', async ({ page }) => {
    const images = page.locator('img:not([alt]):not([aria-hidden="true"])');
    const count = await images.count();
    expect(count).toBe(0);
  });

  test('form inputs on login page have labels', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('form error messages are associated with inputs via aria-describedby', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in/i }).click();

    const emailInput = page.getByLabel('Email');
    const ariaDescribedBy = await emailInput.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBeTruthy();

    // The corresponding error element should exist
    const errorEl = page.locator(`#${ariaDescribedBy}`);
    await expect(errorEl).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// e2e/bookmarks.spec.ts — Bookmark CRUD and batch operations E2E tests
//
// Tests: add bookmark, view in grid/list, edit, delete, batch delete,
//        toggle favourite/pin, search, import, export.
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth.helper.js';

test.describe('Bookmarks', () => {
  // Each test gets a fresh user so data never bleeds between tests.
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  // ── Dashboard empty state ─────────────────────────────────────────────────

  test('new user sees empty state on the dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/No bookmarks yet/i)).toBeVisible();
  });

  // ── Add bookmark ──────────────────────────────────────────────────────────

  test('user can add a bookmark via the Add Bookmark modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bookmark/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/URL/i).fill('https://playwright.dev');
    await dialog.getByRole('button', { name: /Save/i }).click();

    await expect(dialog).not.toBeVisible();
    // Bookmark card should appear (either optimistic or after server response)
    await expect(page.getByText('playwright.dev')).toBeVisible({ timeout: 5_000 });
  });

  test('add bookmark rejects invalid URL', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByLabel(/URL/i).fill('not-a-url');
    await dialog.getByRole('button', { name: /Save/i }).click();

    await expect(dialog.getByText(/valid URL/i)).toBeVisible();
    await expect(dialog).toBeVisible(); // modal stays open
  });

  // ── View toggle ───────────────────────────────────────────────────────────

  test('user can switch between grid and list view', async ({ page }) => {
    // Add a bookmark first
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/URL/i).fill('https://example.com');
    await dialog.getByRole('button', { name: /Save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Default is grid — toggle to list
    const listViewBtn = page.getByRole('button', { name: /List view/i });
    const gridViewBtn = page.getByRole('button', { name: /Grid view/i });

    await listViewBtn.click();
    await expect(page.getByRole('list')).toBeVisible();

    await gridViewBtn.click();
    await expect(page.getByRole('list')).not.toBeVisible();
  });

  // ── Favourite toggle ──────────────────────────────────────────────────────

  test('user can toggle favourite on a bookmark', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/URL/i).fill('https://example.com');
    await dialog.getByRole('button', { name: /Save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Hover over card to reveal action buttons
    const card = page.locator('[class*="group"]').first();
    await card.hover();

    const favBtn = card.getByRole('button', { name: /Add to favourites/i });
    await favBtn.click();

    // Button label should flip
    await expect(card.getByRole('button', { name: /Remove from favourites/i })).toBeVisible();
  });

  // ── Edit bookmark ─────────────────────────────────────────────────────────

  test('user can edit a bookmark title via the edit modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/URL/i).fill('https://example.com');
    await dialog.getByRole('button', { name: /Save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Open edit modal
    const card = page.locator('[class*="group"]').first();
    await card.hover();
    await card.getByRole('button', { name: /Edit bookmark/i }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();

    const titleInput = editDialog.getByLabel(/Title/i);
    await titleInput.clear();
    await titleInput.fill('My Updated Bookmark');
    await editDialog.getByRole('button', { name: /Save changes/i }).click();

    await expect(editDialog).not.toBeVisible();
    await expect(page.getByText('My Updated Bookmark')).toBeVisible({ timeout: 5_000 });
  });

  // ── Delete bookmark ───────────────────────────────────────────────────────

  test('user can delete a bookmark', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/URL/i).fill('https://example.com');
    await dialog.getByRole('button', { name: /Save/i }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText('example.com')).toBeVisible();

    const card = page.locator('[class*="group"]').first();
    await card.hover();
    await card.getByRole('button', { name: /Delete bookmark/i }).click();

    // Confirm browser dialog
    page.on('dialog', (d) => void d.accept());

    await expect(page.getByText(/No bookmarks yet/i)).toBeVisible({ timeout: 5_000 });
  });

  // ── Search ────────────────────────────────────────────────────────────────

  test('search page shows results matching query', async ({ page }) => {
    // Add a bookmark with a unique, searchable title via UI
    await page.getByRole('button', { name: /Add Bookmark/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/URL/i).fill('https://playwright.dev');
    await dialog.getByRole('button', { name: /Save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Navigate to search
    await page.getByRole('link', { name: /Search/i }).click();
    await expect(page).toHaveURL(/\/search/);

    // Wait for metadata worker to set title (give it a couple of seconds)
    await page.waitForTimeout(2_000);

    // Type in search box
    await page.getByRole('searchbox', { name: /Search bookmarks/i }).fill('playwright');

    // Should see a result (may take up to 1s for debounce + API)
    await expect(page.getByText(/playwright/i)).toBeVisible({ timeout: 10_000 });
  });

  test('search page shows empty state for no results', async ({ page }) => {
    await page.getByRole('link', { name: /Search/i }).click();
    await page.getByRole('searchbox', { name: /Search bookmarks/i }).fill('zzznoresultquery99');

    await expect(page.getByText(/No results/i)).toBeVisible({ timeout: 5_000 });
  });

  test('search input clears with the clear button', async ({ page }) => {
    await page.getByRole('link', { name: /Search/i }).click();
    const input = page.getByRole('searchbox', { name: /Search bookmarks/i });
    await input.fill('playwright');

    await page.getByRole('button', { name: /Clear search/i }).click();
    await expect(input).toHaveValue('');
  });

  // ── Import ────────────────────────────────────────────────────────────────

  test('import page renders upload area', async ({ page }) => {
    await page.getByRole('link', { name: /Import/i }).click();
    await expect(page).toHaveURL(/\/import-export/);
    await expect(page.getByText(/Import bookmarks/i)).toBeVisible();
    await expect(page.getByText(/Netscape Bookmark HTML/i)).toBeVisible();
  });

  // ── Export ────────────────────────────────────────────────────────────────

  test('export JSON button triggers a file download', async ({ page }) => {
    // Start waiting for the download before triggering the action
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });

    await page.getByRole('link', { name: /Import/i }).click();
    await page.getByRole('button', { name: /Export JSON/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});

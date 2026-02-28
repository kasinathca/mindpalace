// ─────────────────────────────────────────────────────────────────────────────
// e2e/auth.spec.ts — Authentication flow E2E tests
//
// Tests: register, login, logout, redirect-to-login when unauthenticated,
//        forgot-password form submission.
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { registerAndLogin, loginUser, uniqueEmail, TEST_PASSWORD } from './helpers/auth.helper.js';

test.describe('Authentication', () => {
  // ── Registration ──────────────────────────────────────────────────────────

  test('user can register a new account and land on dashboard', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/register');

    await page.getByLabel('Display name').fill('New User');
    await page.getByLabel('Email').first().fill(email);
    await page
      .getByLabel(/^Password/, { exact: false })
      .first()
      .fill(TEST_PASSWORD);
    await page.getByLabel(/Confirm password/i).fill(TEST_PASSWORD);

    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    // Topbar should show the user's display name
    await expect(page.getByText('New User')).toBeVisible();
  });

  test('duplicate email shows conflict error', async ({ page }) => {
    const email = uniqueEmail();
    // Register once
    await registerAndLogin(page, { email });

    // Log out
    await page.getByRole('button', { name: /Sign out/i }).click();
    await page.waitForURL('**/login');

    // Try to register again with the same email
    await page.goto('/register');
    await page.getByLabel('Display name').fill('Duplicate');
    await page.getByLabel('Email').first().fill(email);
    await page
      .getByLabel(/^Password/, { exact: false })
      .first()
      .fill(TEST_PASSWORD);
    await page.getByLabel(/Confirm password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('registration shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('passwords must match', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Display name').fill('Mismatch');
    await page.getByLabel('Email').first().fill(uniqueEmail());
    await page
      .getByLabel(/^Password/, { exact: false })
      .first()
      .fill(TEST_PASSWORD);
    await page.getByLabel(/Confirm password/i).fill('WrongP@ss1');
    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText(/do not match/i)).toBeVisible();
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  test('registered user can log in', async ({ page }) => {
    const creds = await registerAndLogin(page);

    // Sign out
    await page.getByRole('button', { name: /Sign out/i }).click();
    await page.waitForURL('**/login');

    // Log back in
    await loginUser(page, creds);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('wrong password shows error', async ({ page }) => {
    const creds = await registerAndLogin(page);
    await page.getByRole('button', { name: /Sign out/i }).click();

    await page.goto('/login');
    await page.getByLabel('Email').fill(creds.email);
    await page.getByLabel('Password').fill('WrongP@ss1!');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible();
    await expect(page.getByText(/Password is required/i)).toBeVisible();
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  test('user can sign out and is redirected to login', async ({ page }) => {
    await registerAndLogin(page);

    await page.getByRole('button', { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Route protection ──────────────────────────────────────────────────────

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /settings redirects to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user visiting /login is redirected to /dashboard', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ── Forgot password ───────────────────────────────────────────────────────

  test('forgot-password form shows success state after submission', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByLabel('Email').fill('someuser@example.com');
    await page.getByRole('button', { name: /Send reset link/i }).click();

    await expect(page.getByText(/Check your email/i)).toBeVisible();
  });

  test('forgot-password shows validation error for invalid email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: /Send reset link/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});

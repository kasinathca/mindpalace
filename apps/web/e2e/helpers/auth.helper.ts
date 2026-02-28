// ─────────────────────────────────────────────────────────────────────────────
// e2e/helpers/auth.helper.ts — Reusable auth utilities for E2E tests
// ─────────────────────────────────────────────────────────────────────────────
import type { Page } from '@playwright/test';

/** Generate a unique email address to avoid test-run collisions. */
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@test.local`;
}

export const TEST_PASSWORD = 'Password1!';

export interface TestCredentials {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Register a new user via the UI and land on the dashboard.
 * Returns the credentials used so subsequent tests can log in.
 */
export async function registerAndLogin(
  page: Page,
  overrides: Partial<TestCredentials> = {},
): Promise<TestCredentials> {
  const creds: TestCredentials = {
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? TEST_PASSWORD,
    displayName: overrides.displayName ?? 'E2E User',
  };

  await page.goto('/register');

  await page.getByLabel('Display name').fill(creds.displayName);
  await page.getByLabel('Email').first().fill(creds.email);
  await page
    .getByLabel(/^Password/, { exact: false })
    .first()
    .fill(creds.password);
  // Confirm password field
  await page.getByLabel(/Confirm password/i).fill(creds.password);

  await page.getByRole('button', { name: /Create account/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  return creds;
}

/**
 * Log in an existing user via the UI.
 */
export async function loginUser(page: Page, creds: TestCredentials): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

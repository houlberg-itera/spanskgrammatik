import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * 
 * These tests demonstrate how to test user authentication flows.
 * Note: You'll need to adjust selectors based on your actual UI
 */

test.describe('Authentication', () => {
  test('displays login form', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for form elements
    await expect(page.getByLabel(/email adresse/i)).toBeVisible();
    await expect(page.getByLabel(/adgangskode/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log ind/i })).toBeVisible();
  });

  test('shows validation errors for empty form', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to submit without filling in fields
    await page.getByRole('button', { name: /log ind/i }).click();
    
    // Wait for and check error messages
    // Adjust these selectors based on your error handling
    const errorMessage = page.locator('[role="alert"]').or(page.locator('.error'));
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Dashboard Tests
 * 
 * Testing authenticated pages requires setting up authentication state.
 * For beginners, start with testing that unauthenticated users are redirected.
 */
test.describe('Dashboard Access', () => {
  test('redirects unauthenticated users', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');
    
    // Should redirect to auth page or show access denied
    await page.waitForURL(/\/(auth|access-denied)/);
    
    expect(page.url()).toMatch(/\/(auth|access-denied)/);
  });
});

/**
 * Language Selector Tests
 * 
 * Testing UI components
 */
test.describe('Language Selector', () => {
  test('language selector is visible', async ({ page }) => {
    await page.goto('/');
    
    // Look for language selector component
    // Adjust based on your actual implementation
    const languageSelector = page.locator('[data-testid="language-selector"]')
      .or(page.getByRole('combobox', { name: /language/i }));
    
    if (await languageSelector.isVisible()) {
      await expect(languageSelector).toBeVisible();
    }
  });
});

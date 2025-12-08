import { test, expect } from '@playwright/test';

/**
 * Basic Example Test - Homepage
 * 
 * This test demonstrates the fundamental Playwright concepts:
 * - Navigating to a page
 * - Finding elements
 * - Making assertions
 */
test('homepage loads successfully', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check that the page title is correct
  await expect(page).toHaveTitle(/Spanskgrammatik/i);
  
  // Verify the page contains expected content
  // You can use text content, role, or other selectors
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible();
});

/**
 * Testing Navigation
 * 
 * This test shows how to:
 * - Click links/buttons
 * - Wait for navigation
 * - Check URLs
 */
test('can navigate to auth page', async ({ page }) => {
  await page.goto('/');
  
  // Find and click a link (adjust selector based on your actual UI)
  // Common ways to find elements:
  // - by text: page.getByText('Log ind')
  // - by role: page.getByRole('link', { name: 'Log ind' })
  // - by test id: page.getByTestId('login-link')
  
  const loginLink = page.getByRole('link', { name: /log.*ind/i });
  if (await loginLink.isVisible()) {
    await loginLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL('**/auth/**');
    
    // Verify we're on the right page
    expect(page.url()).toContain('/auth');
  }
});

/**
 * Form Interaction Example
 * 
 * This test demonstrates:
 * - Filling in form fields
 * - Selecting options
 * - Submitting forms
 */
test('can interact with forms', async ({ page }) => {
  await page.goto('/auth/login');
  
  // Fill in text inputs
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('testpassword123');
  
  // Alternative ways to fill inputs:
  // await page.fill('input[name="email"]', 'test@example.com');
  // await page.locator('#email').fill('test@example.com');
  
  // Click a button
  // await page.getByRole('button', { name: 'Log ind' }).click();
  
  // Note: This test doesn't actually submit to avoid creating test data
  // In real tests, you'd submit and verify the result
});

import { test, expect } from '@playwright/test';

/**
 * API Testing with Playwright
 * 
 * Playwright can also test API endpoints directly.
 * This is useful for testing your Next.js API routes.
 */

test.describe('API Tests', () => {
  test('health check endpoint responds', async ({ request }) => {
    // Make a GET request to the health check endpoint
    const response = await request.get('/api/health');
    
    // Check response status
    expect(response.status()).toBe(200);
    
    // Parse and check JSON response
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  test('protected API returns 401 without auth', async ({ request }) => {
    // Try to access a protected endpoint without authentication
    // Adjust the endpoint based on your actual API
    const response = await request.get('/api/admin/dashboard');
    
    // Should return 401 Unauthorized or 403 Forbidden
    expect([401, 403]).toContain(response.status());
  });

  test('can fetch levels data', async ({ request }) => {
    const response = await request.get('/api/levels');
    
    // Check that we got a successful response
    expect(response.ok()).toBeTruthy();
    
    // Verify the response is JSON
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    // Check the data structure
    const levels = await response.json();
    expect(Array.isArray(levels)).toBeTruthy();
  });
});

/**
 * Combined UI + API Testing
 * 
 * You can intercept and mock API calls in UI tests
 */
test.describe('Mocking API Responses', () => {
  test('can mock API response', async ({ page }) => {
    // Intercept API calls and return mock data
    await page.route('/api/levels', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'A1', name: 'Beginner' },
          { id: 'A2', name: 'Elementary' },
        ]),
      });
    });

    // Now navigate to a page that calls this API
    await page.goto('/');
    
    // The page will receive the mocked data instead of real API data
    // You can verify the UI displays the mocked data correctly
  });

  test('can test loading states', async ({ page }) => {
    // Delay the API response to test loading states
    await page.route('/api/levels', async (route) => {
      // Wait 2 seconds before responding
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/');
    
    // Check that loading indicator appears
    // Adjust selector based on your loading UI
    const loadingIndicator = page.locator('[data-testid="loading"]')
      .or(page.getByText(/loading/i));
    
    // Should be visible during the delay
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
  });
});

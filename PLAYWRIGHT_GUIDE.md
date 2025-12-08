# Playwright Testing Guide for Beginners

## What is Playwright?

Playwright is a modern end-to-end testing framework that allows you to test your web application by automating browser interactions. It can test across Chrome, Firefox, and Safari browsers.

## Getting Started

### Running Tests

We've set up several npm scripts for you:

```bash
# Run all tests (headless mode - no browser window)
npm test

# Run tests with UI mode (recommended for beginners - visual interface)
npm run test:ui

# Run tests in headed mode (see the browser)
npm run test:headed

# Debug a specific test (step through line by line)
npm run test:debug

# View the last test report
npm run test:report
```

### Your First Test Run

1. Start by running tests in UI mode to see what's happening:
   ```bash
   npm run test:ui
   ```

2. This will open Playwright's UI where you can:
   - See all your tests
   - Run them one by one
   - Watch them execute
   - See screenshots and traces

## Understanding Test Structure

### Basic Test Anatomy

```typescript
import { test, expect } from '@playwright/test';

test('description of what you're testing', async ({ page }) => {
  // 1. Navigate to a page
  await page.goto('/');
  
  // 2. Interact with elements
  await page.click('button');
  
  // 3. Make assertions
  await expect(page.locator('h1')).toBeVisible();
});
```

### Key Concepts

1. **`test()`** - Defines a test case
2. **`page`** - Represents a browser tab/page
3. **`await`** - Waits for actions to complete
4. **`expect()`** - Makes assertions about what should be true

## Finding Elements (Selectors)

Playwright offers multiple ways to find elements. Use them in this priority order:

### 1. By Role (BEST - Most Reliable)
```typescript
await page.getByRole('button', { name: 'Submit' });
await page.getByRole('link', { name: 'Home' });
await page.getByRole('textbox', { name: 'Email' });
```

### 2. By Label (Good for Forms)
```typescript
await page.getByLabel('Email');
await page.getByLabel('Password');
```

### 3. By Text (Simple & Readable)
```typescript
await page.getByText('Welcome');
await page.getByText(/log.*ind/i); // Regex for flexible matching
```

### 4. By Test ID (When You Add data-testid)
```typescript
// In your component: <button data-testid="submit-btn">Submit</button>
await page.getByTestId('submit-btn');
```

### 5. CSS/XPath Selectors (Last Resort)
```typescript
await page.locator('button.submit');
await page.locator('#email-input');
```

## Common Actions

### Navigation
```typescript
await page.goto('/');
await page.goto('/auth/login');
await page.goBack();
await page.reload();
```

### Clicking
```typescript
await page.click('button');
await page.getByRole('button', { name: 'Submit' }).click();
```

### Typing
```typescript
await page.fill('input[name="email"]', 'test@example.com');
await page.getByLabel('Email').fill('test@example.com');
```

### Waiting
```typescript
// Wait for element to be visible
await page.waitForSelector('h1');

// Wait for navigation to complete
await page.waitForURL('**/dashboard');

// Wait for network to be idle
await page.waitForLoadState('networkidle');
```

## Common Assertions

```typescript
// Check if visible
await expect(page.locator('h1')).toBeVisible();

// Check text content
await expect(page.locator('h1')).toHaveText('Welcome');

// Check URL
await expect(page).toHaveURL(/\/dashboard/);

// Check page title
await expect(page).toHaveTitle('My App');

// Check if element contains text
await expect(page.locator('div')).toContainText('Success');

// Check if element is enabled/disabled
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();
```

## Organizing Tests

### Using describe blocks
```typescript
test.describe('Authentication', () => {
  test('can login', async ({ page }) => {
    // test code
  });

  test('can logout', async ({ page }) => {
    // test code
  });
});
```

### Before/After Hooks
```typescript
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Run before each test
    await page.goto('/dashboard');
  });

  test.afterEach(async ({ page }) => {
    // Run after each test
    // Cleanup code
  });

  test('shows user info', async ({ page }) => {
    // test code
  });
});
```

## Debugging Tips

### 1. Use UI Mode (Easiest)
```bash
npm run test:ui
```
- Click on a test to see it run
- Inspect each step
- See screenshots automatically

### 2. Use Debug Mode
```bash
npm run test:debug
```
- Pauses at each step
- Opens browser DevTools
- Step through your test line by line

### 3. Add Screenshots
```typescript
test('my test', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'screenshot.png' });
});
```

### 4. Use page.pause()
```typescript
test('my test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Test pauses here - you can interact manually
  // More test code...
});
```

## Common Patterns for This App

### Testing Authentication
```typescript
test('can login', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /log.*ind/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard');
  expect(page.url()).toContain('/dashboard');
});
```

### Testing Level Selection
```typescript
test('can select Spanish level', async ({ page }) => {
  // Assumes you're logged in
  await page.goto('/levels');
  
  await page.getByRole('link', { name: /A1/i }).click();
  
  await expect(page).toHaveURL(/\/level\/A1/);
});
```

### Testing Exercise Completion
```typescript
test('can complete an exercise', async ({ page }) => {
  await page.goto('/exercise/123');
  
  // Fill in answer
  await page.getByLabel('Your answer').fill('la casa');
  
  // Submit
  await page.getByRole('button', { name: 'Submit' }).click();
  
  // Check for feedback
  await expect(page.getByText(/correct|incorrect/i)).toBeVisible();
});
```

## Best Practices

1. **Use meaningful test names** - Describe what you're testing
   ```typescript
   // Good
   test('displays error message when email is invalid', ...)
   
   // Bad
   test('test 1', ...)
   ```

2. **Test user behavior, not implementation**
   ```typescript
   // Good - tests what user sees
   await expect(page.getByText('Welcome')).toBeVisible();
   
   // Bad - tests internal class names
   await expect(page.locator('.welcome-message-component')).toBeVisible();
   ```

3. **Keep tests independent** - Each test should work on its own

4. **Use data-testid for dynamic content**
   ```typescript
   // In your component
   <div data-testid="user-score">{score}</div>
   
   // In your test
   await expect(page.getByTestId('user-score')).toHaveText('100');
   ```

5. **Start with critical paths** - Test the most important user journeys first:
   - User registration
   - User login
   - Completing an exercise
   - Viewing progress

## Next Steps

1. **Run the example tests** to see Playwright in action
2. **Modify them** to match your actual UI elements
3. **Write tests for your most important features**
4. **Add `data-testid` attributes** to make elements easier to test
5. **Read the official docs**: https://playwright.dev/docs/intro

## Troubleshooting

### Tests are failing
- Make sure your dev server is running (`npm run dev`)
- Check if element selectors match your actual UI
- Use `npm run test:ui` to see what's happening

### Can't find elements
- Use Playwright Inspector: `npm run test:debug`
- Use `page.pause()` to inspect the page manually
- Add `await page.screenshot({ path: 'debug.png' })` to see what the page looks like

### Tests are slow
- Use `page.waitForLoadState('domcontentloaded')` instead of `'networkidle'`
- Run tests in parallel (already configured)
- Skip unnecessary navigation

## Example Test Template

Copy this template to start a new test:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - navigate to starting point
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // 1. Arrange - set up test data (if needed)
    
    // 2. Act - perform actions
    await page.getByRole('button', { name: 'Click me' }).click();
    
    // 3. Assert - verify results
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Selector Best Practices](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/assertions)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)

Happy Testing! 🎭

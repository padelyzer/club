/**
 * Puppeteer script to authenticate before Lighthouse runs
 * This allows testing of authenticated pages
 */

module.exports = async (browser, context) => {
  // Get a page from the browser
  const page = await browser.newPage();
  
  // Navigate to login page
  await page.goto('http://localhost:3000/login-simple');
  
  // Wait for the login form
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  
  // Fill in login credentials (use test account)
  await page.type('input[name="email"]', 'test@padelyzer.com');
  await page.type('input[name="password"]', 'testpass123');
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
  // Store cookies/session for Lighthouse to use
  const cookies = await page.cookies();
  
  // Set cookies on the context
  await context.setCookie(...cookies);
  
  // Close the setup page
  await page.close();
  
  console.log('Authentication successful for Lighthouse tests');
};
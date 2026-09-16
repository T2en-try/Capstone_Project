import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 500, height: 705 }
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'admin@roadmonitor.com');
  await page.fill('input[type="password"]', 'admin1234');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('**/admin/dashboard');
  
  // Wait for the button
  await page.waitForSelector('button.admin-mobile-menu-btn');
  
  const box = await page.locator('button.admin-mobile-menu-btn').boundingBox();
  console.log('Button Box:', box);
  
  // Get element at the center of the button
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  
  const handle = await page.evaluateHandle(({x, y}) => {
    return document.elementFromPoint(x, y);
  }, {x, y});
  
  const tag = await handle.evaluate(el => el.tagName);
  const className = await handle.evaluate(el => el.className);
  const id = await handle.evaluate(el => el.id);
  
  console.log(`Element at (${x}, ${y}): <${tag.toLowerCase()} id="${id}" class="${className}">`);
  
  await browser.close();
})();

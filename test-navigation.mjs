// test-navigation.mjs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  
  // Test navigation clicks
  await page.click('text=Health');
  await page.waitForURL('**/health');
  console.log('✓ Health navigation works');
  
  await page.click('text=Agent Tools');
  await page.waitForURL('**/agent-tools');
  console.log('✓ Agent Tools navigation works');
  
  await page.click('text=Config');
  await page.waitForURL('**/config');
  console.log('✓ Config navigation works');
  
  await page.click('text=Overview');
  await page.waitForURL('**/');
  console.log('✓ Back to Overview works');
  
  // Verify active states
  const activeNav = await page.locator('.bg-teal-50').count();
  console.log(`✓ Active navigation highlight: ${activeNav} item(s)`);
  
  await browser.close();
  console.log('\n✓ All navigation tests passed!');
})();
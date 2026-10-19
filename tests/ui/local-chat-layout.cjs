// Guest fixtures only: no real inference or account requests.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*.supabase.co/**', async route => {
      const body = route.request().url().includes('functions/')
        ? { conversations: [], messages: [], models: [], response: 'Fixture response' }
        : [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.goto((process.env.CHAT_UI_TEST_URL || 'http://127.0.0.1:5187') + '/chat');
      await page.waitForSelector('.public-chat-workspace', { timeout: 45000 });
      await page.locator('.chat-composer').scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Choose chat model' }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        composer: !!document.querySelector('.chat-composer'),
        selectorCount: document.querySelectorAll('.chat-model-selector').length,
      }));
      assert.deepEqual(state, { overflow: false, composer: true, selectorCount: 1 });
      console.log(name, JSON.stringify(state));
    }
    assert.deepEqual(errors, []);
    console.log('pageerrors', JSON.stringify(errors));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

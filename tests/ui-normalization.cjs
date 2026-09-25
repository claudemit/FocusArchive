/* Run with Playwright available through NODE_PATH; no shipping dependencies. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const errors = [];
  const output = path.resolve('artifacts/ui-normalization');
  fs.mkdirSync(output, {recursive:true});
  try {
    for (const viewport of [{width:360,height:623},{width:360,height:793},{width:720,height:800},{width:1280,height:900}]) {
      const page = await browser.newPage({viewport});
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:4173/');
      await page.waitForFunction(() => document.querySelector('canvas').width > 300);
      for (const tool of ['edit','text','color']) {
        if (viewport.width <= 1080) await page.locator('[data-mobile-tool="'+tool+'"]').click();
        await page.waitForTimeout(100);
        const layout = await page.evaluate(() => {
          const board = document.querySelector('#board').getBoundingClientRect();
          const wrap = document.querySelector('.board-wrap').getBoundingClientRect();
          return {overflow:document.body.scrollWidth > innerWidth, boardFits:board.width>0 && board.height>0 && board.top>=wrap.top-1 && board.bottom<=wrap.bottom+1};
        });
        assert.equal(layout.overflow,false,JSON.stringify({viewport,tool,layout}));
        assert.equal(layout.boardFits,true,JSON.stringify({viewport,tool,layout}));
        await page.screenshot({path:path.join(output,viewport.width+'x'+viewport.height+'-'+tool+'.png')});
      }
      if(viewport.width<=1080) await page.locator('[data-mobile-tool="edit"]').click();
      await page.locator('[data-shape="circle"]').click();
      await page.waitForFunction(() => document.querySelector('[data-shape="circle"]').getAttribute('aria-pressed') === 'true');
      await page.locator('#flip').click();
      await page.waitForFunction(() => document.querySelector('#flip').getAttribute('aria-pressed') === 'true');
      await page.locator('#transformReset').click();
      await page.waitForFunction(() => document.querySelector('#flip').getAttribute('aria-pressed') === 'false');
      await page.locator('#recordStart').click();
      assert.equal(await page.locator('#recordStop').isVisible(),true);
      assert.equal(await page.locator('#recordStart').isVisible(),false);
      await page.locator('#recordStop').click();
      assert.equal(await page.locator('#recordStart').isVisible(),true);
      await page.locator('#export').click();
      assert.equal(await page.locator('#dialog').isVisible(),true);
      await page.locator('#close').click();
      assert.equal(await page.locator('#dialog').isVisible(),false);
      await page.close();
      console.log('PASS '+viewport.width+'x'+viewport.height+' panels, bounds, selection, mirror/reset, recording, export preview');
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1});

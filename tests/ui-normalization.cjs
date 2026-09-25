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
      assert.equal(await page.locator('#noise').count(),0,'noise controls must be removed');
      assert.equal(await page.locator('output:visible').count(),0,'slider value text must not be visible');
      if (viewport.width === 360 && viewport.height === 793) {
        const rect = selector => page.locator(selector).evaluate(node => {
          const value = node.getBoundingClientRect();
          return {top:Math.round(value.top),height:Math.round(value.height),bottom:Math.round(value.bottom)};
        });
        assert.deepEqual({
          brand:await rect('.brand'),
          command:await rect('.command-bar'),
          timeline:await rect('.stage-head'),
          dock:await rect('.tool-dock'),
          dockButton:await rect('.tool-dock button:first-child')
        },{
          brand:{top:52,height:26,bottom:78},
          command:{top:81,height:42,bottom:123},
          timeline:{top:123,height:44,bottom:167},
          dock:{top:719,height:74,bottom:793},
          dockButton:{top:720,height:40,bottom:760}
        },'360x793 mobile safe-area geometry must match the approved design baseline');
      }
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

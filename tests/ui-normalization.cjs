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
          brand:{top:9,height:26,bottom:35},
          command:{top:38,height:42,bottom:80},
          timeline:{top:81,height:44,bottom:125},
          dock:{top:742,height:51,bottom:793},
          dockButton:{top:743,height:40,bottom:783}
        },'360x793 mobile safe-area geometry must match the current layout without system insets');
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
    for (const delayed of [false, true]) {
      const viewport = {width:delayed ? 320 : 360,height:delayed ? 360 : 793};
      const page = await browser.newPage({viewport,isMobile:true,hasTouch:true});
      page.on('pageerror', e => errors.push(e.message));
      if (!delayed) {
        await page.addInitScript(() => {
          window.xhs = {miniTool:{}};
          document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.style.setProperty('--safe-area-inset-top','59px');
          });
        });
      }
      await page.goto('http://127.0.0.1:4173/');
      await page.waitForFunction(() => document.querySelector('canvas').width > 300);
      if (delayed) {
        assert.equal(await page.locator('html.mini-tool-host').count(),0);
        await page.evaluate(() => { window.xhs = {miniTool:{}}; });
        await page.waitForSelector('html.mini-tool-host');
      }
      const layout = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const board = rect('#board');
        const canvas = document.querySelector('#canvas');
        const brand = rect('.header-brand');
        const title = document.querySelector('.brand b');
        return {
          brandTop:brand.top,
          brandBottom:brand.bottom,
          brandCenter:(brand.left + brand.right) / 2,
          titleFits:title.scrollWidth <= title.clientWidth,
          commandTop:rect('.command-bar').top,
          commandBottom:rect('.command-bar').bottom,
          timelineTop:rect('.stage-head').top,
          panelBottom:rect('main>aside').bottom,
          dockTop:rect('.tool-dock').top,
          boardFits:board.height > 0 && Math.abs(board.width / board.height - canvas.width / canvas.height) < .003
        };
      });
      assert.equal(layout.brandTop,delayed ? 36 : 59);
      assert.equal(layout.brandBottom,delayed ? 80 : 103);
      assert.ok(Math.abs(layout.brandCenter - viewport.width / 2) < .1);
      assert.ok(layout.titleFits);
      assert.equal(layout.commandTop,layout.brandBottom + 5);
      assert.ok(layout.commandBottom <= layout.timelineTop);
      assert.ok(layout.panelBottom <= layout.dockTop);
      assert.ok(layout.boardFits);
      await page.close();
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1});

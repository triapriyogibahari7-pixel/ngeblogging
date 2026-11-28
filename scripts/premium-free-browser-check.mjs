import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PREMIUM_FREE_THEMES } from '../src/premium-free-catalog.mjs';
import { buildThemeSrcDoc, configFromTheme } from '../src/theme-system.js';

const directory='artifacts/premium-free';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const width of [390,820,1440]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    await page.route('**/*',route=>route.abort());
    for(const theme of PREMIUM_FREE_THEMES) {
      const errors=[];const onError=error=>errors.push(error.message);page.on('pageerror',onError);
      try {
        await page.setContent(buildThemeSrcDoc(theme.code,configFromTheme(theme),[]),{waitUntil:'load'});
        await page.evaluate(()=>document.fonts.ready);
        await page.locator('.ng-hero h1').first().waitFor({state:'visible'});
        assert.equal(await page.locator('.ng-header nav').count()>0,true,theme.id+' page navigation');
        assert.equal(await page.locator('.ng-brand').count()>0,true,theme.id+' site brand');
        assert.equal(await page.locator('.ng-cards article').count(),12,theme.id+' post slots');
        const report=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,title:document.querySelector('.ng-hero h1')?.textContent.trim(),externalImages:[...document.images].filter(img=>/^https?:/i.test(img.getAttribute('src')||'')).length}));
        assert.ok(report.title,theme.id+' public hero title');assert.ok(report.width<=report.viewport+1,theme.id+' horizontal page overflow');
        assert.equal(report.externalImages,0,theme.id+' remote images');assert.deepEqual(errors,[],theme.id+' page errors');
        await page.screenshot({path:`${directory}/${theme.id}-${width}.png`,fullPage:true});
        results.push({id:theme.id,width,status:'passed',checks:report});
      } catch(error) {results.push({id:theme.id,width,status:'failed',error:error.message});}
      finally {page.off('pageerror',onError);}
    }
    await page.close();
  }
} finally {await browser.close();await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));}
assert.equal(results.length,PREMIUM_FREE_THEMES.length*3,'all candidate/viewport combinations must run');
assert.equal(results.filter(item=>item.status==='failed').length,0,'browser failures; inspect results.json');

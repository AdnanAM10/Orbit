import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
async function main(){
 await mkdir('screenshots',{recursive:true});
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto('http://127.0.0.1:3000');
 await page.getByRole('heading',{name:'A little clarity. A lot of progress.'}).waitFor();
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'screenshots/dashboard.png',fullPage:true});
 await page.getByRole('button',{name:'Toggle theme'}).click();
 await page.locator('.kanban-column').first().evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
 await page.screenshot({path:'screenshots/dark-mode.png',fullPage:true});
 await page.getByRole('button',{name:'Toggle theme'}).click();
 await page.locator('.kanban-column').first().evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'screenshots/mobile.png',fullPage:true});
 for(const view of ['Tasks','Calendar','Analytics','Settings']){
  await page.locator('.sidebar').getByRole('button',{name:view,exact:true}).click();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw Error(`Horizontal overflow in ${view}`);
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.sidebar').getByRole('button',{name:'Calendar',exact:true}).click();
 await page.screenshot({path:'screenshots/calendar.png',fullPage:true});
 await page.locator('.sidebar').getByRole('button',{name:'Analytics',exact:true}).click();
 await page.screenshot({path:'screenshots/analytics.png',fullPage:true});
 await browser.close();
 console.log(JSON.stringify({consoleErrors:errors}));
 if(errors.length)throw Error('Browser console errors detected');
}
main();

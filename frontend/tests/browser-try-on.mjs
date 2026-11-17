// Non-billable UI acceptance only: every SDK/provider response is a fixture.
// All non-localhost requests are blocked, even if a fixture is misconfigured.
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdtemp,readFile,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(process.env.MIRROR_TEST_TOOLS?resolve(process.env.MIRROR_TEST_TOOLS,'package.json'):import.meta.url);
const {build}=require('esbuild'),{chromium}=require('playwright');
const project=new URL('..',import.meta.url).pathname,output=await mkdtemp(join(tmpdir(),'mirror-decart-'));
const fakeSDK=`
 export const noopLogger={}; export const models={realtime:name=>({name})};
 window.decartFixture={connects:0,switches:[],stops:0};
 export function createDecartClient(config){return {realtime:{async connect(input,opts){
  const f=window.decartFixture;f.connects++;f.input=input;f.model=opts.model.name;f.initialBytes=await opts.initialState.image.text();f.initialPrompt=opts.initialState.prompt.text;
  await config.apiKeyProvider();
  const c=document.createElement('canvas');c.width=640;c.height=360;
  let tick=0;const draw=()=>{const ctx=c.getContext('2d');ctx.fillStyle='rgb(190,30,90)';ctx.fillRect(0,0,640,360);ctx.fillStyle='white';ctx.fillText('MOCK REMOTE VIDEO '+(++tick),30,30)};
  draw();const timer=setInterval(draw,33),remote=c.captureStream(30);f.remote=remote;opts.onRemoteStream(remote);
  return {on(){},disconnect(){f.stops++;clearInterval(timer);remote.getTracks().forEach(t=>t.stop())},async setImage(image,options){f.switches.push({bytes:await image.text(),prompt:options.prompt})}};
 }}}}
`;
await build({entryPoints:[join(project,'tests/try-on-harness.tsx')],bundle:true,outfile:join(output,'bundle.js'),format:'iife',tsconfig:join(project,'tsconfig.json'),define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_API_BASE_URL':'"/api/v1"'},plugins:[{name:'fake-decart-transport',setup(b){b.onResolve({filter:/^@decartai\/sdk$/},()=>({path:'fake-sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:fakeSDK}));}}]});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const errors=[],blocked=[],requests=[];
const origin='http://localhost:3128';let tokenStatus=200,garmentStatus=200;
try{
 const context=await browser.newContext({permissions:['camera'],viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
 const products=ids.map((id,i)=>({id,name:'Catalog garment '+(i+1),price:89,image:'/products/demo-top-shirt.png',variants:[{id:'44444444-4444-4444-8444-444444444444',size:'M',color:'Blue',inStock:true}]}));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){blocked.push(url.origin);return route.abort();}
  if(url.pathname==='/api/v1/products')return route.fulfill({json:products});
  if(url.pathname.startsWith('/api/v1/decart/')){
   requests.push({path:url.pathname,method:route.request().method()});
   if(url.pathname.endsWith('/token'))return route.fulfill({status:tokenStatus,json:tokenStatus===200?{apiKey:'ek_fixture',expiresAt:new Date(Date.now()+60000).toISOString(),model:'lucy-vton-latest',maxSessionSeconds:60}:{error:'fixture disabled'}});
   return route.fulfill({status:garmentStatus,contentType:'image/png',body:await readFile(join(project,'public/products/demo-top-shirt.png'))});
  }
  if(url.pathname.endsWith('.png'))return route.fulfill({contentType:'image/png',body:await readFile(join(project,'public/products/demo-top-shirt.png'))});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="root"></div></body></html>'});
 });
 await page.goto(origin+'/mirror');
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 await page.locator('.mirror-product-card').waitFor();
 assert.equal(await page.locator('iframe,canvas,video').count(),0);
 await page.locator('.mirror-product-actions .mirror-primary-button').click();
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('mirror-shopping-cart')||'[]').length===1);
 await page.locator('.mirror-product-actions .mirror-secondary-button').click();
 await page.waitForURL(origin+'/mirror/try-on?productId='+ids[0]);
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 await page.getByAltText('Selected garment: Catalog garment 1').waitFor();
 await page.waitForFunction(()=>document.querySelector('footer img')?.naturalWidth>0);
 assert.equal(requests.filter(r=>r.path.endsWith('/token')).length,0);
 assert.equal(await page.locator('iframe,canvas').count(),0);
 const start=page.getByRole('button',{name:'Start AI Fitting',exact:true});
 assert.equal(await start.isDisabled(),true);
 await page.getByRole('button',{name:'Enter Fullscreen',exact:true}).click();
 await page.waitForFunction(()=>!!document.fullscreenElement);
 await page.getByRole('button',{name:'Exit Fullscreen',exact:true}).click();
 await page.waitForFunction(()=>!document.fullscreenElement);
 await page.getByRole('checkbox').check(); await start.click();
 await page.waitForFunction(()=>document.querySelector('[data-decart-output]').currentTime>0.1);
 assert.equal(await page.evaluate(()=>document.querySelector('[data-decart-output]').srcObject===window.decartFixture.remote),true);
 assert.equal(await page.evaluate(()=>window.decartFixture.initialBytes),(await readFile(join(project,'public/products/demo-top-shirt.png'))).toString());
 assert.ok(requests.filter(r=>r.path.includes('/garments/')).every(r=>r.path.endsWith(ids[0])));
 await page.getByRole('button',{name:'Stop AI Fitting',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.decartFixture.input.getTracks().every(t=>t.readyState==='ended')),true);
 tokenStatus=403; await start.click();
 await page.getByRole('alert').filter({hasText:'token unavailable'}).waitFor();
 assert.equal(await page.evaluate(()=>window.decartFixture.connects),1);
 assert.equal(await page.locator('iframe,canvas').count(),0);
 await page.getByRole('link',{name:/Back to Catalog/}).click();
 await page.waitForURL(origin+'/mirror');
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 await page.waitForFunction(()=>document.querySelector('.mirror-side-nav b')?.textContent==='1');
 assert.equal(await page.locator('iframe,canvas,video').count(),0);
 products.forEach(p=>p.variants.forEach(v=>v.inStock=false));
 await page.reload();
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 await page.locator('.mirror-product-card').waitFor();
 assert.equal(await page.locator('.mirror-product-actions .mirror-secondary-button').isEnabled(),true);
 assert.equal(await page.locator('.mirror-product-actions .mirror-primary-button').isDisabled(),true);
 products.splice(0);
 await page.reload();
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 await page.waitForTimeout(500);
 assert.equal(await page.locator('.mirror-product-card').count(),0);
 assert.deepEqual(errors,[]); assert.deepEqual(blocked,[]);
 console.log('PASS: catalog navigation and cart preservation, consent, selected image, fullscreen enter/exit, mock remote stream, cleanup, token failure, no iframe/renderer; no provider requests.');
} finally { await browser.close(); }

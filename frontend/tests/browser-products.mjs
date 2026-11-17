// Component acceptance for admin previews. Next navigation/image adapters are
// replaced in this isolated harness; production authorization is never bypassed.
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdtemp,readFile,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(process.env.MIRROR_TEST_TOOLS?resolve(process.env.MIRROR_TEST_TOOLS,'package.json'):import.meta.url);
const {build}=require('esbuild'),{chromium}=require('playwright');
const output=await mkdtemp(join(tmpdir(),'mirror-admin-'));
const project=new URL('..',import.meta.url).pathname;
await build({entryPoints:[join(project,'tests/admin-harness.tsx')],bundle:true,outfile:join(output,'bundle.js'),format:'iife',tsconfig:join(project,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"','process.env.NEXT_PUBLIC_ENABLE_LIVE_CATALOG':'"false"','process.env.NEXT_PUBLIC_API_BASE_URL':'"/api/v1"'},plugins:[{name:'next-browser-adapters',setup(build){build.onResolve({filter:/^next\/(navigation|link|image)$/},args=>({path:args.path,namespace:'mock-next'}));build.onLoad({filter:/.*/,namespace:'mock-next'},args=>({resolveDir:join(project,'node_modules'),loader:'jsx',contents:args.path==='next/navigation'?`export function useRouter(){return {push(){},replace(){},refresh(){}}}`:args.path==='next/link'?`import React from 'react';export default function Link({children,href,...props}){return <a href={href} {...props}>{children}</a>}`:`import React from 'react';export default function Image({fill,priority,unoptimized,...props}){return <img {...props}/>} `}));}}]});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
const products=[],writes=[],errors=[];
let catalogReady=false, catalogReads=0, createAttempts=0, uploadAttempts=0;
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!=='http://localhost:3129') return route.abort();
  if(url.pathname==='/api/v1/admin/products'){
   catalogReads++;
   // A failed initial load leaves liveProducts === null in the component.
   return catalogReady ? route.fulfill({json:products}) : route.fulfill({status:503,json:{error:'Catalog offline'}});
  }
  if(url.pathname==='/api/v1/products' && req.method()==='POST'){
   createAttempts++;
   if(createAttempts===1)return route.fulfill({status:422,json:{error:'Product validation failed'}});
   const product={...req.postDataJSON(),id:'11111111-1111-4111-8111-111111111111',image:'',stock:0};
   products.push(product);writes.push({method:'POST',path:url.pathname,product});
   return route.fulfill({status:201,json:product});
  }
  if(url.pathname===`/api/v1/products/${products[0]?.id}`){
   if(req.method()==='PUT'){
    Object.assign(products[0],req.postDataJSON());
    writes.push({method:'PUT',product:{...products[0]}});
    return route.fulfill({json:products[0]});
   }
   if(req.method()==='DELETE'){
    products[0].status='Archived';
    writes.push({method:'DELETE'});
    return route.fulfill({json:{ok:true}});
   }
  }
  if(url.pathname.endsWith('/images')){
   uploadAttempts++;
   writes.push({method:'UPLOAD',path:url.pathname,body:req.postDataBuffer().toString()});
   if(uploadAttempts===1)return route.fulfill({status:503,json:{error:'Storage unavailable'}});
   catalogReady=true;
   products[0].image='/product.png';
   return route.fulfill({status:201,json:{}});
  }
  if(url.pathname==='/product.png')return route.fulfill({contentType:'image/png',body:await readFile(join(project,'public/products/demo-top-shirt.png'))});
  if(url.pathname.startsWith('/api/'))throw new Error(`Unexpected API request: ${req.method()} ${url.pathname}`);
  return route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'});
 });
 await page.goto('http://localhost:3129/brand/products');
 // Use compiled application styles, from either a production or development build.
 const cssRoot=join(project,'.next');
 async function loadStyles(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
   const path=join(dir,entry.name);
   if(entry.isDirectory())await loadStyles(path);
   else if(entry.name.endsWith('.css'))await page.addStyleTag({content:await readFile(path,'utf8')});
  }
 }
 await loadStyles(cssRoot);
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 await page.evaluate(()=>window.renderAdmin('brand','products','EN'));
 await page.getByRole('status').filter({hasText:'Live catalog unavailable'}).waitFor();
 assert.equal(catalogReads,1);
 await page.getByRole('button',{name:'Add product',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.waitFor();
 const save=dialog.getByRole('button',{name:'Save product',exact:true});
 assert.equal(await save.isEnabled(),true,'Save must be enabled while liveProducts is null');
 await page.locator('#record-name').fill('First cotton shirt');
 await page.locator('#record-category').selectOption('Tops');
 await page.locator('#record-price').fill('49.50');
 await page.locator('#record-sku').fill('SHIRT');
 await page.locator('#record-description').fill('Blue cotton shirt');
 await page.locator('#record-variants').fill('S · Blue · SHIRT-S\nM · Blue · SHIRT-M');
 await page.locator('#record-status').selectOption('Published');
 await page.locator('#record-image').setInputFiles(join(project,'public/products/demo-top-shirt.png'));
 await save.click();
 // The POST is attempted even though catalog loading failed; errors stay in the form.
 await dialog.getByRole('alert').filter({hasText:'Product validation failed'}).waitFor();
 assert.equal(createAttempts,1);
 assert.equal(products.length,0);
 assert.equal(await save.isEnabled(),true);
 await save.click();
 await dialog.getByRole('alert').filter({hasText:'Product was saved, but image upload failed'}).waitFor();
 assert.equal(products.length,1);
 assert.equal(catalogReady,false);
 // Upload retry must update the saved product despite another failed catalog refresh.
 await save.click();
 await dialog.waitFor({state:'hidden'});
 await page.getByText('First cotton shirt',{exact:true}).first().waitFor();
 assert.equal(createAttempts,2,'Retry must not create a duplicate product');
 assert.equal(products.length,1);
 assert.equal(uploadAttempts,2);
 assert.equal(writes[0].method,'POST');
 assert.equal(writes[0].product.variants.length,2);
 assert.ok(writes.find(w=>w.method==='UPLOAD').body.includes('name="approved"'));
 assert.ok(writes.find(w=>w.method==='UPLOAD').body.includes('image/png'));
 assert.ok(catalogReads>=3,'Catalog is refreshed after save and upload retry');
 // Existing products continue to use PUT for edits and publication changes.
 await page.getByRole('button',{name:'Actions for First cotton shirt',exact:true}).click();
 await page.getByRole('menuitem',{name:'Edit',exact:true}).click();
 await page.locator('#record-name').fill('Updated cotton shirt');
 await page.locator('#record-status').selectOption('Draft');
 await save.click();
 await dialog.waitFor({state:'hidden'});
 await page.getByText('Updated cotton shirt',{exact:true}).first().waitFor();
 assert.equal(products[0].status,'Draft');
 await page.getByRole('button',{name:'Actions for Updated cotton shirt',exact:true}).click();
 await page.getByRole('menuitem',{name:'Edit',exact:true}).click();
 await page.locator('#record-status').selectOption('Published');
 await save.click();
 await dialog.waitFor({state:'hidden'});
 assert.equal(products[0].status,'Published');
 assert.equal(createAttempts,2);
 // Archive uses the existing DELETE endpoint and refreshes the admin catalog.
 await page.getByRole('button',{name:'Actions for Updated cotton shirt',exact:true}).click();
 await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
 await page.getByRole('alertdialog').getByRole('button',{name:'Delete record',exact:true}).click();
 await page.getByRole('alertdialog').waitFor({state:'hidden'});
 assert.equal(products[0].status,'Archived');
 assert.equal(writes.at(-1).method,'DELETE');
 assert.deepEqual(errors,[]);
 console.log('PASS: creation with liveProducts === null; inline POST/upload errors; retry without duplicate; edit, publish, archive and catalog refresh; all APIs mocked, no provider requests.');
} finally {await browser.close();}

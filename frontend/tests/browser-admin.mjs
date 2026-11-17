// Component acceptance for admin previews. Next navigation/image adapters are
// replaced in this isolated harness; production authorization is never bypassed.
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdtemp,readFile,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {UI_MESSAGES} from '../lib/translations/ui.ts';
const require=createRequire(process.env.MIRROR_TEST_TOOLS?resolve(process.env.MIRROR_TEST_TOOLS,'package.json'):import.meta.url);
const {build}=require('esbuild'),{chromium}=require('playwright');
const output=await mkdtemp(join(tmpdir(),'mirror-admin-'));
const project=new URL('..',import.meta.url).pathname;
await build({entryPoints:[join(project,'tests/admin-harness.tsx')],bundle:true,outfile:join(output,'bundle.js'),format:'iife',tsconfig:join(project,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"','process.env.NEXT_PUBLIC_ENABLE_LIVE_CATALOG':'"false"','process.env.NEXT_PUBLIC_API_BASE_URL':'"/api/v1"'},plugins:[{name:'next-browser-adapters',setup(build){build.onResolve({filter:/^next\/(navigation|link|image)$/},args=>({path:args.path,namespace:'mock-next'}));build.onLoad({filter:/.*/,namespace:'mock-next'},args=>({resolveDir:join(project,'node_modules'),loader:'jsx',contents:args.path==='next/navigation'?`export function useRouter(){return {push(){},replace(){},refresh(){}}}`:args.path==='next/link'?`import React from 'react';export default function Link({children,href,...props}){return <a href={href} {...props}>{children}</a>}`:`import React from 'react';export default function Image({fill,priority,unoptimized,...props}){return <img {...props}/>} `}));}}]});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',headless:true,args:['--no-sandbox']});
const results=[],errors=[],leaks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
 await page.route('http://mirror.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}));
 await page.goto('http://mirror.test/');
 for(const file of await readdir(join(project,'.next/static/css')))if(file.endsWith('.css'))await page.addStyleTag({content:await readFile(join(project,'.next/static/css',file),'utf8')});
 await page.addScriptTag({content:await readFile(join(output,'bundle.js'),'utf8')});
 if(errors.length)throw new Error(JSON.stringify(errors));
 await page.waitForFunction(()=>typeof window.renderAdmin==='function');
 const sections={brand:['dashboard','products','stock-receiving','inventory','transfers','branches','devices','staff','analytics','subscription','notifications','integrations','settings'],'super-admin':['dashboard','brands','applications','branches','campaigns','subscriptions','notifications','audit-logs','settings'],staff:['dashboard','products','stock-receiving','inventory','devices','analytics'],admin:['dashboard','products']};
 for(const language of (process.env.MIRROR_ADMIN_LANGUAGES?.split(',')||['EN','UZ','RU','KK','AR','TR']))for(const [kind,items] of Object.entries(sections))for(const section of items){
  await page.evaluate(({kind,section,language})=>window.renderAdmin(kind,section,language),{kind,section,language});
  await page.waitForTimeout(40);
  const heading=await page.getByRole('heading',{level:1}).first().textContent();assert.ok(heading);
  assert.equal(await page.locator('.mirror-admin').getAttribute('dir'),language==='AR'?'rtl':'ltr');
  if(language==='UZ'){
   const texts=await page.evaluate(()=>{const a=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode()){const e=n.parentElement;if(e&&!e.closest('script,style')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden')a.push({text:n.textContent.trim(),html:e.outerHTML.slice(0,700)})}return a;});
   for(const {text,html} of texts){const e=UI_MESSAGES[text];if(e?.EN===text && e.UZ!==text)leaks.push({kind,section,text,html:text==='Active'?html:undefined});}
  }
  results.push({kind,section,language,heading});
 }
 await page.screenshot({path:join(output,'admin-tr.png')});
 await writeFile(join(output,'results.json'),JSON.stringify({results,errors,leaks},null,2));
 console.log(JSON.stringify({output,cases:results.length,errors,leaks},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}

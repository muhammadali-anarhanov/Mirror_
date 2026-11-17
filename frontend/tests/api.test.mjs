import test from 'node:test';
import assert from 'node:assert/strict';
import {apiFetch} from '../lib/api.ts';
test('paid submission never retries even after a 401',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return new Response('{}',{status:401});};
 try{const response=await apiFetch('/decart/token',{method:'POST',body:JSON.stringify({consent:true})},{retryAuth:false});assert.equal(response.status,401);assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/decart/token'));}
 finally{globalThis.fetch=original;}
});
test('read-only catalog requests retain session-refresh behavior',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async url=>{calls.push(url);return new Response('{}',{status:calls.length===1?401:200});};
 try{assert.equal((await apiFetch('/products')).status,200);assert.equal(calls.length,3);assert.ok(calls[1].endsWith('/auth/refresh'));}
 finally{globalThis.fetch=original;}
});
test('ambiguous paid transport failure propagates without any automatic retry',async()=>{
 const original=globalThis.fetch;let count=0;globalThis.fetch=async()=>{count++;throw new TypeError('fixture network failure');};
 try{await assert.rejects(apiFetch('/decart/token',{method:'POST'},{retryAuth:false}));assert.equal(count,1);}
 finally{globalThis.fetch=original;}
});

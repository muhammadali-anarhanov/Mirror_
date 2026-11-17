import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogEnabled, persistProduct, productRecord} from '../lib/admin/product-api.ts';
const record = {id:'new', name:'Blue shirt', category:'Tops', price:42.5, sku:'SHIRT', status:'Published', description:'Cotton', variants:'S · Blue · SHIRT-S\nM · Blue · SHIRT-M'};
test('catalog writes persist sizes/colors before uploading approved images', async () => {
  assert.equal(catalogEnabled, true);
  const original = globalThis.fetch, calls=[];
  globalThis.fetch=async (url,init)=>{
    calls.push({url,init});
    return Response.json(url.endsWith('/images') ? {} : {...JSON.parse(init.body), id:'saved-id', image:'', stock:0});
  };
  try {
    await persistProduct(record, undefined, [new File(['png'],'shirt.png',{type:'image/png'})]);
    assert.equal(calls.length,2);
    const payload=JSON.parse(calls[0].init.body);
    assert.equal(payload.category,'Top Body');
    assert.deepEqual(payload.variants.map(v=>[v.size,v.color]),[['S','Blue'],['M','Blue']]);
    assert.equal(payload.status,'Published');
    assert.ok(calls[1].url.endsWith('/products/saved-id/images'));
    assert.equal(calls[1].init.body.get('approved'),'true');
    assert.equal(calls[1].init.body.get('file').name,'shirt.png');
    assert.equal(productRecord({...payload,id:'saved-id',image:'',stock:0}).name,record.name);
  } finally {globalThis.fetch=original;}
});
test('upload failure exposes the saved product for editing instead of duplicate creation', async()=>{
 const original=globalThis.fetch;let saved;
 globalThis.fetch=async(url,init)=>url.endsWith('/images') ? Response.json({error:'storage unavailable'},{status:503}) : Response.json({...JSON.parse(init.body),id:'saved-id',image:'',stock:0});
 try {
  await assert.rejects(persistProduct(record,undefined,[new File(['x'],'x.png')],p=>saved=p),/Product was saved/);
  assert.equal(saved.id,'saved-id');
 } finally {globalThis.fetch=original;}
});

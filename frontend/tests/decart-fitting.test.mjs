import test from 'node:test';
import assert from 'node:assert/strict';
import {DecartFittingSession, DECART_MODEL, decartError} from '../lib/decart-fitting.ts';

const garment={id:'11111111-1111-4111-8111-111111111111',name:'Merchant Blue Jacket'};
function fixture({tokenStatus=200,garmentStatus=200,connectFailure=false}={}) {
 const calls=[],states=[],remote=[];const output={fixture:'remote',getTracks:()=>[{stop:()=>{}}]};let stopped=0,disconnected=0,options,provider;
 const stream={getTracks:()=>[{stop:()=>stopped++}],getVideoTracks:()=>[{addEventListener(){}}]};
 const rt={disconnect:()=>disconnected++,on(){},setImage:async(blob,prompt)=>calls.push({setImage:blob,prompt})};
 const session=new DecartFittingSession({
  getCamera:async()=>stream,releaseCamera:()=>{},state:(s,m)=>states.push({s,m}),remote:s=>remote.push(s),
  request:async(path,init)=>{calls.push({path,init});return path.includes('/garments/') ? new Response(new Blob(['garment'],{type:'image/png'}),{status:garmentStatus}) : Response.json({apiKey:'ek_fixture',expiresAt:new Date(Date.now()+60000).toISOString(),model:DECART_MODEL,maxSessionSeconds:60},{status:tokenStatus});},
  loadSDK:async()=>({noopLogger:{},models:{realtime:m=>({name:m})},createDecartClient:config=>{provider=config.apiKeyProvider;return {realtime:{connect:async(input,opts)=>{calls.push({connect:input});options=opts;assert.equal(await provider(),'ek_fixture');if(connectFailure)throw {code:'WEB_RTC_ERROR'};opts.onRemoteStream(output);return rt;}}};}}),
 });
 return {session,calls,states,remote,output,get stopped(){return stopped},get disconnected(){return disconnected},get options(){return options},get provider(){return provider}};
}
test('selected catalog bytes initialize SDK; remote video and garment switch use one connection',async()=>{
 const f=fixture();try {
 await f.session.start(garment);
 assert.equal(f.options.model.name,DECART_MODEL);assert.equal(f.options.retries,0);
 assert.equal(await f.options.initialState.image.text(),'garment');
 assert.match(f.options.initialState.prompt.text,/Merchant Blue Jacket/);
 assert.equal(f.remote.at(-1),f.output);
 assert.notEqual(f.states.at(-1).s,'streaming'); // receiving a stream alone isn't frame proof
 f.session.videoPlaying();assert.equal(f.states.at(-1).s,'streaming');
 await f.session.switchGarment({...garment,id:'22222222-2222-4222-8222-222222222222',name:'Second garment'});
 assert.equal(f.calls.filter(c=>c.connect).length,1);assert.equal(f.calls.filter(c=>c.setImage).length,1);
 assert.match(f.calls.find(c=>c.setImage).prompt.prompt,/Second garment/);
 // SDK redials (capacity queue / reconnect) reuse the same short-lived token; no extra mint.
 assert.equal(await f.provider(),'ek_fixture');assert.equal(f.calls.filter(c=>c.path==='/decart/token').length,1);
 }finally{f.session.stop()}
 await assert.rejects(f.provider(),/Explicit restart/);
 assert.ok(f.stopped);assert.equal(f.disconnected,1);assert.equal(f.remote.at(-1),null);
});
test('disabled token never opens realtime session and releases camera',async()=>{
 const f=fixture({tokenStatus:503});await f.session.start(garment);
 assert.equal(f.calls.filter(c=>c.connect).length,0);assert.equal(f.states.at(-1).s,'error');assert.ok(f.stopped);
});
test('invalid garment never requests token; demo product rejected',async()=>{
 const f=fixture({garmentStatus:422});await f.session.start(garment);
 assert.equal(f.calls.filter(c=>c.path==='/decart/token').length,0);
 const g=fixture();await g.session.start({...garment,demo:true});assert.equal(g.calls.length,0);
});
test('connection failure never retries; reconnect stops session',async()=>{
 const f=fixture({connectFailure:true});await f.session.start(garment);
 assert.equal(f.calls.filter(c=>c.connect).length,1);assert.match(f.states.at(-1).m,/WEB_RTC_ERROR/);
 const g=fixture();await g.session.start(garment);g.options.onConnectionChange('reconnecting');
 assert.equal(g.disconnected,1);assert.equal(g.states.at(-1).s,'error');
});
test('stop while connecting disconnects late connection and ignores remote output',async()=>{
 const f=fixture();const promise=f.session.start(garment);f.session.stop();await promise;
 assert.equal(f.calls.filter(c=>c.connect).length,0);assert.ok(f.stopped);
});
test('SDK error strings and credentials are never exposed',()=>{
 assert.doesNotMatch(decartError({message:'dct_secret https://host?apiKey=secret'}),/dct_secret|apiKey/);
 assert.doesNotMatch(decartError({code:'dct_secret'}),/dct_secret/);
 assert.match(decartError({name:'OverconstrainedError'}),/OverconstrainedError/);
 assert.doesNotMatch(decartError({name:'dct_secret https://x'}),/dct_secret/);
});

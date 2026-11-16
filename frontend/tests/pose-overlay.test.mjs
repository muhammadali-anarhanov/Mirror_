import test from 'node:test';
import assert from 'node:assert/strict';
import { garmentTransform, projectPoint, smoothTransform } from '../lib/pose-overlay.ts';
const view = { videoWidth: 1000, videoHeight: 1000, width: 1000, height: 1000, fit: 'contain', mirrored: false };
function pose(dx=0, dy=0) { const p=Array.from({length:33},()=>({x:0,y:0,visibility:0})); for(const [i,x,y] of [[11,.35,.25],[12,.65,.25],[23,.4,.65],[24,.6,.65]])p[i]={x:x+dx,y:y+dy,visibility:.95,presence:.95};return p; }
const map=(t,x,y)=>({x:t.a*x+t.c*y+t.e,y:t.b*x+t.d*y+t.f});
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('shirt shoulder anchors land on actual shoulder points, hem follows hips',()=>{const t=garmentTransform(pose(),view);assert(t);close(map(t,150,100).x,350);close(map(t,450,100).x,650);close(map(t,300,100).y,250);close(map(t,300,660).y,250+400*1.12)});
test('translation follows the person instead of a fixed screen position',()=>{const a=garmentTransform(pose(),view),b=garmentTransform(pose(.1,.05),view);close(b.e-a.e,100);close(b.f-a.f,50)});
test('mirroring reverses horizontal movement exactly once',()=>{const v={...view,mirrored:true};const a=garmentTransform(pose(),v),b=garmentTransform(pose(.1),v);close(b.e-a.e,-100);close(projectPoint({x:.2,y:.5},v).x,800)});
test('shoulder roll rotates the shirt and hip sway changes the torso axis',()=>{const p=pose();p[12].y+=.08;p[23].x+=.06;p[24].x+=.06;const t=garmentTransform(p,view);assert(t.b>0);assert(t.c>0);close(map(t,150,100).y,250);close(map(t,450,100).y,330)});
test('person approaching camera enlarges the garment',()=>{const p=pose();p[11].x=.2;p[12].x=.8;p[23].y=.85;p[24].y=.85;const a=garmentTransform(pose(),view),b=garmentTransform(p,view);assert(b.a>a.a);assert(b.d>a.d)});
test('contain accounts for letterbox offsets',()=>{const v={...view,videoWidth:1920,videoHeight:1080,width:600,height:800};close(projectPoint({x:0,y:0},v).y,231.25);close(projectPoint({x:1,y:1},v).y,568.75)});
test('cover accounts for cropping in portrait and mirror',()=>{const v={...view,videoWidth:1920,videoHeight:1080,width:400,height:800,fit:'cover',mirrored:true};close(projectPoint({x:.5,y:.5},v).x,200);close(projectPoint({x:.5,y:.5},v).y,400);assert(projectPoint({x:0,y:.5},v).x>400)});
test('lost pose and low-confidence hips hide the overlay',()=>{assert.equal(garmentTransform([],view),null);const p=pose();p[23].visibility=.2;assert.equal(garmentTransform(p,view),null)});
test('missing/off-screen and invalid landmarks never draw a floating shirt',()=>{const p=pose();p[11].x=NaN;assert.equal(garmentTransform(p,view),null);p[11]={x:-.1,y:.2,visibility:1};assert.equal(garmentTransform(p,view),null)});
test('sideways shoulders and invalid viewport are rejected',()=>{const p=pose();p[12].x=p[11].x+.001;assert.equal(garmentTransform(p,view),null);assert.equal(garmentTransform(pose(),{...view,width:0}),null)});
test('smoothing interpolates all six transform values; new tracks start immediately',()=>{const a=garmentTransform(pose(),view),b=garmentTransform(pose(.1),view);assert.deepEqual(smoothTransform(null,b),b);close(smoothTransform(a,b,.5).e,(a.e+b.e)/2);assert.deepEqual(smoothTransform(a,b,1),b)});

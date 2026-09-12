import test from 'node:test';
import assert from 'node:assert/strict';
import {bindCameraGestures} from '../dist/camera-gestures.mjs';

function fixture(){
 const host=new EventTarget(),captured=new Set(),rotations=[],zooms=[];
 let enabled=true,starts=0;
 host.clientHeight=600;
 host.setPointerCapture=id=>captured.add(id);
 host.hasPointerCapture=id=>captured.has(id);
 host.releasePointerCapture=id=>captured.delete(id);
 const dispose=bindCameraGestures(host,{canRotate:()=>enabled,onStart:()=>starts++,onRotate:(x,y)=>rotations.push([x,y]),onZoom:delta=>zooms.push(delta)});
 function send(type,values={},control=false){
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{button:0,isPrimary:true,pointerId:1,clientX:100,clientY:100,deltaX:0,deltaY:0,deltaMode:0,ctrlKey:false,...values});
  Object.defineProperty(event,'target',{value:{closest:()=>control?{}:null}});
  host.dispatchEvent(event);return event;
 }
 return {send,rotations,zooms,captured,dispose,setEnabled:value=>enabled=value,get starts(){return starts;}};
}

test('dragging a streaming surface rotates through pointer capture and ends cleanly',()=>{
 const f=fixture();assert.equal(f.send('pointerdown').defaultPrevented,true);
 f.send('pointermove',{clientX:140,clientY:120});
 f.send('pointermove',{pointerId:2,clientX:300});
 f.send('pointerup');f.send('pointermove',{clientX:500});
 assert.deepEqual(f.rotations,[[40,20]]);assert.equal(f.captured.size,0);
});
test('player controls keep their pointer and wheel gestures without rotating the camera',()=>{
 const f=fixture();
 assert.equal(f.send('pointerdown',{},true).defaultPrevented,false);
 f.send('pointermove',{clientX:400});
 assert.equal(f.send('wheel',{deltaX:50,deltaY:20},true).defaultPrevented,false);
 assert.deepEqual(f.rotations,[]);assert.equal(f.starts,0);
});
test('ordinary scrolling never rotates, zooms, or consumes the scroll event',()=>{
 const f=fixture();
 for(const deltaMode of [0,1,2]){
  assert.equal(f.send('wheel',{deltaX:24,deltaY:-10,deltaMode}).defaultPrevented,false);
 }
 assert.deepEqual(f.rotations,[]);assert.deepEqual(f.zooms,[]);assert.equal(f.starts,0);
});
test('pinch still zooms without rotating the model',()=>{
 const f=fixture();
 assert.equal(f.send('wheel',{deltaY:-7,ctrlKey:true}).defaultPrevented,true);
 f.send('wheel',{deltaY:2,deltaMode:1,ctrlKey:true});
 assert.deepEqual(f.rotations,[]);assert.deepEqual(f.zooms,[-7,32]);
});
test('touch rotation requires a held pointer and ignores scrolling during the drag',()=>{
 const f=fixture();
 f.send('pointermove',{pointerType:'touch',clientY:150});assert.deepEqual(f.rotations,[]);
 f.send('pointerdown',{pointerType:'touch'});
 assert.equal(f.send('wheel',{deltaY:80}).defaultPrevented,false);
 f.send('pointermove',{pointerType:'touch',clientX:130,clientY:160});
 f.send('pointerup',{pointerType:'touch'});
 f.send('pointermove',{pointerType:'touch',clientY:200});
 assert.deepEqual(f.rotations,[[30,60]]);assert.equal(f.captured.size,0);
});
test('interactive websites and snapshots retain scrolling and cancel an existing rotation',()=>{
 const f=fixture();f.send('pointerdown');f.setEnabled(false);
 f.send('pointermove',{clientX:300});
 assert.equal(f.captured.size,0);
 assert.equal(f.send('wheel',{deltaY:80}).defaultPrevented,false);
 assert.equal(f.send('pointerdown').defaultPrevented,false);
 assert.deepEqual(f.rotations,[]);
});
test('secondary pointers, cancellation, and disposal cannot leave rotation stuck',()=>{
 const f=fixture();f.send('pointerdown',{button:2});f.send('pointerdown',{isPrimary:false});
 assert.equal(f.starts,0);
 f.send('pointerdown');f.send('pointercancel');f.send('pointermove',{clientX:200});
 assert.deepEqual(f.rotations,[]);
 f.send('pointerdown');f.dispose();
 assert.equal(f.captured.size,0);
 assert.equal(f.send('wheel',{deltaY:50}).defaultPrevented,false);
});

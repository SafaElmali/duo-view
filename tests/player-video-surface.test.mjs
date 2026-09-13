import test from 'node:test';
import assert from 'node:assert/strict';
import {bindVideoSurface} from '../dist/player-video-surface.mjs';

function fixture({videoFrames=true}={}){
 const doc=new EventTarget(),video=new EventTarget(),callbacks=new Map(),draws=[];
 let nextId=0,failDraw=false;
 const request=callback=>{callbacks.set(++nextId,callback);return nextId;};
 const cancel=id=>callbacks.delete(id);
 doc.hidden=false;doc.defaultView={requestAnimationFrame:request,cancelAnimationFrame:cancel};
 Object.assign(video,{ownerDocument:doc,currentTime:0,readyState:4,videoWidth:854,videoHeight:480,paused:true,ended:false});
 if(videoFrames){video.requestVideoFrameCallback=request;video.cancelVideoFrameCallback=cancel;}
 const canvas={width:300,height:150,hidden:true,getContext:()=>({drawImage(source,x,y,w,h){if(failDraw)throw new Error('Frame not available');draws.push({time:source.currentTime,w,h});}})};
 const surface=bindVideoSurface(video,canvas);
 function emit(type){video.dispatchEvent(new Event(type));}
 function frame(time){video.currentTime=time;const queued=[...callbacks.values()];callbacks.clear();queued.forEach(callback=>callback());}
 return {video,canvas,doc,surface,draws,callbacks,emit,frame,failDraw:value=>failDraw=value};
}

test('keeps the poster until playback starts, then paints decoded frames at native size',()=>{
 const f=fixture();f.surface.setActive(true);f.emit('loadeddata');
 assert.equal(f.canvas.hidden,true);assert.equal(f.draws.length,0);
 f.video.paused=false;f.emit('play');f.emit('playing');
 assert.equal(f.callbacks.size,1);assert.equal(f.canvas.hidden,false);
 f.frame(.5);f.frame(1);
 assert.deepEqual(f.draws.map(draw=>draw.time),[0,.5,1]);
 assert.deepEqual([f.canvas.width,f.canvas.height],[854,480]);
});

test('pausing cancels continuous drawing but seeking while paused updates the picture',()=>{
 const f=fixture();f.surface.setActive(true);f.video.paused=false;f.emit('play');f.frame(3);
 f.video.paused=true;f.emit('pause');assert.equal(f.callbacks.size,0);
 f.video.currentTime=34;f.emit('seeked');
 assert.equal(f.draws.at(-1).time,34);assert.equal(f.callbacks.size,0);
});

test('buffering and temporary decode failures preserve the last good frame and recover',()=>{
 const f=fixture();f.surface.setActive(true);f.video.paused=false;f.emit('play');f.frame(5);
 f.video.readyState=1;f.frame(6);assert.equal(f.draws.at(-1).time,5);assert.equal(f.canvas.hidden,false);
 f.video.readyState=4;f.failDraw(true);f.frame(7);assert.equal(f.draws.at(-1).time,5);
 f.failDraw(false);f.frame(8);assert.equal(f.draws.at(-1).time,8);
});

test('leaving the streaming view or hiding the tab cancels work and resumes with a fresh frame',()=>{
 const f=fixture();f.surface.setActive(true);f.video.paused=false;f.emit('play');f.frame(2);
 f.surface.setActive(false);assert.equal(f.callbacks.size,0);
 f.video.currentTime=4;f.emit('seeked');assert.equal(f.draws.at(-1).time,2);
 f.surface.setActive(true);assert.equal(f.draws.at(-1).time,4);assert.equal(f.callbacks.size,1);
 f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(f.callbacks.size,0);
 f.video.currentTime=6;f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(f.draws.at(-1).time,6);assert.equal(f.callbacks.size,1);
});

test('older browsers use animation frames without repainting an unchanged video frame',()=>{
 const f=fixture({videoFrames:false});f.surface.setActive(true);f.video.paused=false;f.emit('play');
 f.frame(1);f.frame(1);f.frame(1.5);
 assert.deepEqual(f.draws.map(draw=>draw.time),[0,1,1.5]);
 f.video.paused=true;f.emit('pause');assert.equal(f.callbacks.size,0);
});

test('errors and disposal cancel callbacks, and disposed players ignore future events',()=>{
 const f=fixture();f.surface.setActive(true);f.video.paused=false;f.emit('play');f.frame(2);
 f.emit('error');assert.equal(f.callbacks.size,0);
 f.emit('playing');assert.equal(f.callbacks.size,1);
 f.surface.dispose();assert.equal(f.callbacks.size,0);
 f.video.currentTime=9;f.emit('seeked');f.emit('play');f.surface.setActive(true);
 assert.equal(f.callbacks.size,0);assert.equal(f.draws.at(-1).time,2);
});

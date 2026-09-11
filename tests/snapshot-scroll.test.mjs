import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotScroller} from '../dist/snapshot-scroll.mjs';

const capture={key:'page|626|890',image:'https://example.com/full.png',height:15928,contentHeight:890};
function frame(){
 const view=new EventTarget();view.scrollY=0;
 view.scrollTo=(_,top)=>{view.scrollY=top;queueMicrotask(()=>view.dispatchEvent(new Event('scroll')));};
 const frame=new EventTarget();frame.contentWindow=view;
 frame.contentDocument={body:{dataset:{snapshotImage:capture.image}}};
 frame.hasAttribute=()=>true;
 return frame;
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function nativeScroll(frame,top){frame.contentWindow.scrollY=top;frame.contentWindow.dispatchEvent(new Event('scroll'));}

test('scrolling either half moves both halves and the flat screen to the same page position',async()=>{
 const frames=[frame(),frame(),frame()],scroller=createSnapshotScroller(frames);
 scroller.update(capture);
 for(const [index,top]of [[1,445],[2,1700],[0,980]]){
  nativeScroll(frames[index],top);await settle();
  assert.deepEqual(frames.map(frame=>frame.contentWindow.scrollY),[top,top,top]);
  assert.deepEqual(scroller.getState(),{top,max:15038});
 }
 scroller.dispose();
});
test('folding preserves the scroll position, reloaded surfaces rejoin, and viewport changes reset it',async()=>{
 const frames=[frame(),frame(),frame()],scroller=createSnapshotScroller(frames);
 scroller.update(capture);nativeScroll(frames[1],1400);await settle();
 scroller.update({...capture});
 assert.equal(scroller.getState().top,1400);
 frames[2].contentWindow.scrollY=0;frames[2].dispatchEvent(new Event('load'));await settle();
 assert.equal(frames[2].contentWindow.scrollY,1400);
 scroller.update({...capture,key:'page|890|626',contentHeight:626});await settle();
 assert.deepEqual(frames.map(frame=>frame.contentWindow.scrollY),[0,0,0]);
 assert.deepEqual(scroller.getState(),{top:0,max:15302});
 scroller.dispose();
});
test('scrolling clamps at the page bounds, including a single-screen capture',async()=>{
 const frames=[frame(),frame(),frame()],scroller=createSnapshotScroller(frames);
 scroller.update(capture);nativeScroll(frames[0],20000);await settle();
 assert.deepEqual(frames.map(frame=>frame.contentWindow.scrollY),[15038,15038,15038]);
 nativeScroll(frames[1],-50);await settle();
 assert.deepEqual(frames.map(frame=>frame.contentWindow.scrollY),[0,0,0]);
 scroller.update({...capture,height:890});
 nativeScroll(frames[1],400);await settle();
 assert.deepEqual(frames.map(frame=>frame.contentWindow.scrollY),[0,0,0]);
 assert.deepEqual(scroller.getState(),{top:0,max:0});
 scroller.dispose();
});
test('loading, live pages, stale images, and disposed viewers cannot synchronize scroll',async()=>{
 const frames=[frame(),frame(),frame()],scroller=createSnapshotScroller(frames);
 scroller.update({key:capture.key});nativeScroll(frames[0],300);await settle();
 assert.deepEqual(scroller.getState(),{top:0,max:0});
 frames[0].hasAttribute=()=>false;
 frames[0].contentDocument=null;
 frames[1].contentDocument.body.dataset.snapshotImage='https://example.com/old.png';
 scroller.update(capture);
 nativeScroll(frames[0],700);nativeScroll(frames[1],800);await settle();
 assert.equal(scroller.getState().top,0);
 nativeScroll(frames[2],900);await settle();
 assert.equal(scroller.getState().top,900);
 scroller.update(null);nativeScroll(frames[2],1200);await settle();
 assert.equal(scroller.getState().top,0);
 scroller.update(capture);scroller.dispose();
 nativeScroll(frames[2],1500);frames[2].dispatchEvent(new Event('load'));await settle();
 assert.equal(scroller.getState().top,0);
});

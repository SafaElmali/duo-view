import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameNavigator} from '../dist/preview-frame.mjs';

function fixture(){
 const frame=new EventTarget(),attributes=new Map(),operations=[],loading=[],timeouts=[];
 let id=0;const timers=new Map();
 const sibling={},parent={insertBefore(node,next){assert.equal(node,frame);assert.equal(next,sibling);operations.push('mount');node.parentNode=parent;node.nextSibling=sibling;}};
 Object.assign(frame,{parentNode:parent,nextSibling:sibling,contentDocument:{URL:'about:blank'},remove(){operations.push('unmount');this.parentNode=null;},removeAttribute(name){attributes.delete(name);}});
 for(const name of ['src','srcdoc'])Object.defineProperty(frame,name,{get:()=>attributes.get(name),set(value){assert.equal(frame.parentNode,null,'configure the source outside the previous browsing context');attributes.set(name,value);}});
 const navigate=createFrameNavigator({setLoading:(_frame,busy,url)=>loading.push({busy,url}),setTimer:callback=>{timers.set(++id,callback);return id;},clearTimer:id=>timers.delete(id)});
 const go=(options={})=>navigate(frame,{url:'https://example.com/',onTimeout:url=>timeouts.push(url),...options});
 return {frame,attributes,operations,loading,timeouts,timers,go};
}

test('switching a captured page to a website destroys the old context before assigning the new source',()=>{
 const {go,attributes,operations,loading}=fixture();
 go({url:'https://old.example/',html:'<img src="old-snapshot.png">'});
 go({url:'https://www.beehiiv.com/'});
 assert.deepEqual(operations,['unmount','mount','unmount','mount']);
 assert.equal(attributes.get('src'),'https://www.beehiiv.com/');assert.equal(attributes.has('srcdoc'),false);
 assert.deepEqual(loading.at(-1),{busy:true,url:'https://www.beehiiv.com/'});
});

test('ordinary viewport updates retain the live browsing context; explicit Reload recreates it',()=>{
 const {go,operations,timers}=fixture();go();go();go();
 assert.equal(operations.length,2);assert.equal(timers.size,1);
 go({force:true});assert.equal(operations.length,4);assert.equal(timers.size,1);
});

test('a stalled live navigation requests a fallback for its own URL only',()=>{
 const {go,timers,timeouts}=fixture();go();const old=[...timers.values()][0];
 go({url:'https://next.example/'});old();assert.deepEqual(timeouts,[]);
 [...timers.values()][0]();assert.deepEqual(timeouts,['https://next.example/']);
});

test('switching to a snapshot or disabling a screen cancels any pending live fallback',()=>{
 for(const replacement of [{html:'<p>Preparing snapshot</p>'},{url:'about:blank'}]){
  const {go,timers,timeouts}=fixture();go();const pending=[...timers.values()][0];
  go(replacement);assert.equal(timers.size,0);pending();assert.deepEqual(timeouts,[]);
 }
});

test('an initial blank load keeps waiting; completion clears the indicator and fallback timer',()=>{
 const {go,frame,loading,timers}=fixture();go();frame.dispatchEvent(new Event('load'));
 assert.equal(loading.at(-1).busy,true);assert.equal(timers.size,1);
 // Cross-origin contentDocument is null; its document is never inspected.
 frame.contentDocument=null;frame.dispatchEvent(new Event('load'));
 assert.equal(loading.at(-1).busy,false);assert.equal(timers.size,0);
});

test('a new snapshot replaces its predecessor, and repeated synchronization preserves it',()=>{
 const {go,attributes,operations,timers}=fixture();
 go({html:'old image'});go({html:'new image'});go({html:'new image'});
 assert.equal(operations.length,4);assert.equal(attributes.get('srcdoc'),'new image');assert.equal(attributes.get('src'),'about:blank');assert.equal(timers.size,0);
});

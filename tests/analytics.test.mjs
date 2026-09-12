import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics,safeProperties,analyticsOptions,bindAnalyticsControls} from '../dist/analytics.mjs';
const config={key:'phc_test',host:'https://us.i.posthog.com'};
const location={protocol:'https:',hostname:'duo-view.netlify.app'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('analytics excludes typed URLs, text, errors, and arbitrary strings',()=>{
 assert.deepEqual(safeProperties({url:'https://private.example?token=secret',error:'raw user input',source:'https://private.example',mode:'snapshot',width:626,muted:true,seconds:NaN,content:'website'}),{mode:'snapshot',width:626,muted:true,content:'website'});
 const options=analyticsOptions(config.host);
 assert.equal(options.autocapture,false);assert.equal(options.disable_session_recording,true);
 assert.equal(options.before_send({event:'$autocapture'}),null);
 assert.ok(options.property_denylist.includes('$current_url'));
});
test('missing config and development pages never load analytics by default',async()=>{
 let loads=0;const load=()=>{loads++;return {capture(){}};};
 for(const configCase of [{},config]){
  const a=createAnalytics(configCase,{location:{protocol:'file:',hostname:''},load});a.start();a.track('duo_opened');
 }
 const a=createAnalytics({}, {location,load});a.start();await tick();assert.equal(loads,0);
});
test('shared preview URLs cannot leak through automatic or persisted session attribution',()=>{
 const shared='https://duo-view.netlify.app/#duo=1&url=https%3A%2F%2Fexample.com%2F';
 const event={event:'duo_share_copied',properties:{token:'phc_test',distinct_id:'anonymous',$session_id:'session',success:true,app:'duo_view',orientation:'landscape',
  $current_url:shared,$session_entry_url:shared,$initial_person_info:{properties:{$initial_current_url:shared}},$session_entry_referrer:shared,$session_entry_utm_source:'private campaign',$host:'duo-view.netlify.app'}};
 const options=analyticsOptions(config.host),filtered=options.before_send(event);
 assert.equal(options.disable_capture_url_hashes,true);
 assert.deepEqual(filtered,{event:'duo_share_copied',properties:{token:'phc_test',distinct_id:'anonymous',$session_id:'session',success:true,app:'duo_view',orientation:'landscape'}});
 assert.equal(event.properties.$session_entry_url,shared);
});
test('early events flush once after SDK loads and high-frequency events are limited',async()=>{
 let ready,clock=0;const sent=[];
 const a=createAnalytics(config,{location,now:()=>clock,load:()=>new Promise(resolve=>ready=resolve)});
 a.start();a.start();a.track('duo_opened');
 for(let i=0;i<40;i++)a.track('duo_model_rotated',{input:'pointer'},1500);
 await tick();ready({capture:(...args)=>sent.push(args)});await tick();
 assert.equal(sent.length,2);assert.equal(sent[0][1].environment,'production');
 clock=1600;a.track('duo_model_rotated',{input:'pointer'},1500);assert.equal(sent.length,3);
});
test('SDK failures never break app interactions or keep buffering events',async()=>{
 const a=createAnalytics(config,{location,load:()=>Promise.reject(new Error('Blocked by browser'))});
 a.start();a.track('duo_opened');await tick();assert.doesNotThrow(()=>a.track('duo_view_selected'));
 const b=createAnalytics(config,{location,load:()=>({capture(){throw new Error('Offline');}})});
 b.start();await tick();assert.doesNotThrow(()=>b.track('duo_view_selected'));
});
test('control tracking uses final slider changes, ignores URL fields and disabled controls',()=>{
 const listeners={},events=[];bindAnalyticsControls({addEventListener:(type,listener)=>listeners[type]=listener},(...args)=>events.push(args));
 const change=(selector,value)=>listeners.change({target:{value,matches:selectors=>selectors.split(',').includes(selector)}});
 change('#site-url','https://example.com?secret=123');assert.equal(events.length,0);
 change('#fold-angle','100');assert.deepEqual(events.pop(),['duo_hinge_changed',{angle:100}]);
 change('.player-progress input','24');assert.deepEqual(events.pop(),['duo_player_seeked',{seconds:24}]);
 listeners.click({target:{closest:selector=>selector==='[data-view]'?{disabled:true}:null}});assert.equal(events.length,0);
 listeners.click({target:{closest:selector=>selector==='[data-view]'?{}:null}});assert.equal(events[0][0],'duo_view_selected');
});

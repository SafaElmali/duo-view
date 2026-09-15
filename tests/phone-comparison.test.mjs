import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonDevices,REFERENCE_PHONES} from '../dist/phone-comparison.mjs';

test('All Duo views preserves four preset viewports regardless of current or custom selection',()=>{
 const state={comparison:'poses',display:'open',orientation:'landscape',custom:{width:1234,height:567},reference:'compact',url:'https://example.com/path?query=1'};
 const before=structuredClone(state);
 const devices=comparisonDevices(state);
 assert.deepEqual(devices.map(device=>[device.id,device.size.width,device.size.contentHeight]),[
  ['folded-portrait',466,678],['folded-landscape',678,466],['open-portrait',626,890],['open-landscape',890,626],
 ]);
 assert.ok(devices.every(device=>!device.reference));
 assert.deepEqual(state,before);
});

test('Phone vs Duo uses a generic reference alongside the selected Duo display',()=>{
 const devices=comparisonDevices({comparison:'phone',reference:'standard',display:'folded',orientation:'portrait'});
 assert.equal(devices.length,2);
 assert.deepEqual(devices.map(({reference,size})=>[reference,size.width,size.height]),[[true,390,844],[false,466,678]]);
 assert.match(devices[0].label,/Standard phone/);assert.match(devices[1].label,/Duo.*Folded/);
 assert.equal(devices[0].display,'folded'); // Reference phone never receives a fold hinge.
});

test('each reference phone rotates with the Duo without changing its intended aspect ratio',()=>{
 const expected={compact:[800,360],standard:[844,390],large:[932,430]};
 for(const reference of Object.keys(expected)){
  const [phone,duo]=comparisonDevices({comparison:'phone',reference,display:'open',orientation:'landscape'});
  assert.deepEqual([phone.size.width,phone.size.height],expected[reference]);
  assert.deepEqual([duo.size.width,duo.size.height],[890,626]);
  assert.equal(phone.orientation,'landscape');assert.equal(duo.orientation,'landscape');
 }
});

test('browser chrome occupies the same CSS height on both screens and never changes their scale dimensions',()=>{
 const state={comparison:'phone',reference:'compact',display:'open',orientation:'portrait'};
 const bare=comparisonDevices(state),chrome=comparisonDevices({...state,chrome:true});
 for(let index=0;index<2;index++){
  assert.equal(chrome[index].size.contentHeight,bare[index].size.contentHeight-102);
  assert.equal(chrome[index].size.outerHeight,bare[index].size.outerHeight);
  assert.equal(chrome[index].size.outerWidth,bare[index].size.outerWidth);
 }
});

test('custom Duo dimensions are exact CSS dimensions and never override or double-rotate the reference',()=>{
 const [phone,duo]=comparisonDevices({comparison:'phone',reference:'large',display:'open',orientation:'landscape',chrome:true,custom:{width:1100,height:700}});
 assert.deepEqual(phone.size,{width:932,height:430,contentHeight:328,outerWidth:958,outerHeight:456});
 assert.deepEqual(duo.size,{width:1100,height:700,contentHeight:598,outerWidth:1126,outerHeight:726});
 assert.throws(()=>comparisonDevices({comparison:'phone',custom:{width:0,height:700}}),/Dimensions/);
});

test('missing state uses all Duo views and unknown reference values fall back to standard safely',()=>{
 assert.equal(comparisonDevices().length,4);
 for(const reference of [undefined,'missing','__proto__','constructor']){
  const [phone]=comparisonDevices({comparison:'phone',reference});
  assert.equal(phone.id,'reference-standard');assert.equal(phone.size.width,390);
 }
 assert.ok(Object.isFrozen(REFERENCE_PHONES));
 for(const phone of Object.values(REFERENCE_PHONES))assert.ok(Object.isFrozen(phone));
});

test('new calls have independent dimensions so renderer adjustments cannot leak into later previews',()=>{
 const state={comparison:'phone',reference:'standard',display:'open',orientation:'portrait'};
 const devices=comparisonDevices(state);devices[0].size.width=999;devices[1].size.height=999;
 const next=comparisonDevices(state);
 assert.equal(next[0].size.width,390);assert.equal(next[1].size.height,890);
});

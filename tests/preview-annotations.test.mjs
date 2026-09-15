import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_ANNOTATION_NOTE_LENGTH,validateAnnotation,normalizeAnnotation,annotationRegionFromPoints} from '../dist/preview-annotations.mjs';

test('annotations preserve text safely as text and normalize optional geometry',()=>{
 assert.equal(validateAnnotation(null),null);assert.equal(normalizeAnnotation(undefined),null);
 assert.deepEqual(validateAnnotation({note:'  The menu overlaps\nthis heading.  '}),{note:'The menu overlaps\nthis heading.',rect:null});
 const note='<img src=x onerror=alert(1)> & https://example.com/';
 assert.deepEqual(validateAnnotation({note}),{note,rect:null});
 assert.equal(validateAnnotation({note:'x'.repeat(MAX_ANNOTATION_NOTE_LENGTH)}).note.length,500);
});

test('strict share validation rejects malformed notes and arbitrary nested data',()=>{
 for(const value of ['',[],false,4,{}, {note:null},{note:1},{note:''},{note:' \n '},{note:'x'.repeat(501)},{note:'ok',url:'https://evil.example/'},{note:'ok',rect:'0,0,1,1'},{note:'ok',rect:{x:0,y:0,width:1,height:1,html:'x'}}]){
  assert.throws(()=>validateAnnotation(value));assert.equal(normalizeAnnotation(value),null);
 }
});

test('normalized regions remain wholly inside the viewport and require nonempty dimensions',()=>{
 const valid={note:'',rect:{x:.125,y:.25,width:.5,height:.75}};
 assert.deepEqual(validateAnnotation(valid),valid);
 for(const rect of [{x:-.01,y:0,width:.5,height:.5},{x:0,y:0,width:0,height:.5},{x:0,y:0,width:.5,height:0},{x:0,y:.9,width:.5,height:.2},{x:.8,y:0,width:.3,height:.5},{x:Infinity,y:0,width:.5,height:.5},{x:NaN,y:0,width:.5,height:.5},{x:'0',y:0,width:.5,height:.5},{x:0,y:0,width:.5},{x:0,y:0,width:.0001,height:.5}])assert.throws(()=>validateAnnotation({note:'Layout',rect}));
});

test('normalization returns independent, compact geometry for reproducible sharing',()=>{
 const annotation={note:'Heading',rect:{x:.123456789,y:.2,width:.2,height:.3}};
 const saved=validateAnnotation(annotation);
 assert.deepEqual(saved,{note:'Heading',rect:{x:.12346,y:.2,width:.2,height:.3}});
 saved.rect.x=.8;assert.equal(annotation.rect.x,.123456789);
 assert.deepEqual(validateAnnotation({note:'',rect:{x:.7,y:0,width:.3,height:1}}),{note:'',rect:{x:.7,y:0,width:.3,height:1}});
 const edge=validateAnnotation({note:'Edge',rect:{x:.123455,y:.123455,width:.876545,height:.876545}});
 assert.deepEqual(validateAnnotation(JSON.parse(JSON.stringify(edge))),edge);
});

test('drag regions account for iframe origin and preview scale in either direction',()=>{
 const bounds={left:100,top:180,width:300,height:500};
 const start={x:130,y:280},end={x:280,y:580};
 const region={x:.1,y:.2,width:.5,height:.6};
 assert.deepEqual(annotationRegionFromPoints(start,end,bounds),region);
 assert.deepEqual(annotationRegionFromPoints(end,start,bounds),region);
 assert.deepEqual(annotationRegionFromPoints({x:230,y:460},{x:530,y:1060},{left:170,top:260,width:600,height:1000}),region);
});

test('dragging beyond screen edges clips highlight; clicks and hidden frames create no region',()=>{
 const bounds={left:100,top:100,width:500,height:800};
 assert.deepEqual(annotationRegionFromPoints({x:50,y:0},{x:800,y:1000},bounds),{x:0,y:0,width:1,height:1});
 assert.equal(annotationRegionFromPoints({x:150,y:150},{x:150,y:150},bounds),null);
 assert.equal(annotationRegionFromPoints({x:150,y:150},{x:155,y:150},bounds),null);
 assert.equal(annotationRegionFromPoints({x:NaN,y:150},{x:160,y:180},bounds),null);
 assert.equal(annotationRegionFromPoints({x:150,y:150},{x:160,y:180},{...bounds,width:0}),null);
 assert.equal(annotationRegionFromPoints({x:150,y:150},{x:160,y:180},undefined),null);
});

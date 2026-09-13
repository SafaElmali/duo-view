import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as T from '../dist/assets/three/three.module.min.js';import {createDuoModel,modelRoll,MODEL} from '../dist/duo-model.mjs';
test('folded halves overlap in width while maintaining separate surfaces',()=>{const m=createDuoModel();m.fold(180);m.root.updateMatrixWorld(true);const open=new T.Box3().setFromObject(m.root).getSize(new T.Vector3());m.fold(0);m.root.updateMatrixWorld(true);const closed=new T.Box3().setFromObject(m.root).getSize(new T.Vector3());assert.ok(open.x>4.8);assert.ok(closed.x<2.6);assert.ok(closed.z>open.z);const surface=m.outerAnchor.getWorldPosition(new T.Vector3());assert.ok(surface.z>.2);m.dispose();});
test('inner and outer display anchors face the viewer at the corresponding endpoints',()=>{const m=createDuoModel();for(const [angle,anchor]of[[180,m.innerAnchor],[0,m.outerAnchor]]){m.fold(angle);m.root.updateMatrixWorld(true);const q=anchor.getWorldQuaternion(new T.Quaternion());assert.ok(new T.Vector3(0,0,1).applyQuaternion(q).z>.99);}assert.throws(()=>m.fold(-1));assert.throws(()=>m.fold(181));m.dispose();});
test('device roll maps the wide inner display and tall cover to both orientations',()=>{assert.equal(modelRoll('open','landscape'),0);assert.equal(modelRoll('open','portrait'),Math.PI/2);assert.equal(modelRoll('folded','portrait'),0);assert.equal(modelRoll('folded','landscape'),-Math.PI/2);});
test('download is a valid binary glTF with two hinged halves and animation',()=>{const bytes=readFileSync(new URL('../dist/assets/iphone-duo.glb',import.meta.url));assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);const length=bytes.readUInt32LE(12);const json=JSON.parse(bytes.subarray(20,20+length).toString());assert.ok(json.nodes.some(node=>node.name==='Hinge_Right'));assert.ok(json.nodes.some(node=>node.name==='Outer_Display'));assert.ok(json.meshes.length>20);assert.equal(json.animations[0].name,'Unfold');});

test('each inner screen follows its half through a tabletop fold',()=>{const m=createDuoModel();m.fold(90);m.root.rotation.set(-Math.PI/4,0,Math.PI/2);m.root.updateMatrixWorld(true);const left=m.innerLeftAnchor.getWorldPosition(new T.Vector3()),right=m.innerRightAnchor.getWorldPosition(new T.Vector3());assert.ok(right.y>left.y);for(const anchor of [m.innerLeftAnchor,m.innerRightAnchor]){const normal=new T.Vector3(0,0,1).applyQuaternion(anchor.getWorldQuaternion(new T.Quaternion()));assert.ok(normal.z>.6,'Both screen halves face the viewer in tabletop mode');}m.dispose();});

test('the fully open screen covers the hinge from edge to edge in both orientations',()=>{
 const m=createDuoModel();m.fold(180);
 for(const orientation of ['landscape','portrait']){
  m.root.rotation.z=modelRoll('open',orientation);m.root.updateMatrixWorld(true);
  for(const x of [-.001,0,.001])for(const y of [-MODEL.innerHeight/2+.001,0,MODEL.innerHeight/2-.001]){
   const origin=new T.Vector3(x,y,1).applyMatrix4(m.root.matrixWorld);
   const hits=new T.Raycaster(origin,new T.Vector3(0,0,-1)).intersectObject(m.root,true);
   assert.ok(m.displays.slice(0,2).includes(hits[0]?.object),'The display must cover the center seam, including its top and bottom ends');
  }
 }
 m.dispose();
});

test('the inner display and page surfaces share a continuous fold at every opening angle',()=>{
 const m=createDuoModel();
 for(const angle of [45,60,100,115,160,179,180])for(const orientation of ['landscape','portrait']){
  m.fold(angle);m.root.rotation.z=modelRoll('open',orientation);m.root.updateMatrixWorld(true);
  const leftEdge=m.innerLeftAnchor.localToWorld(new T.Vector3(MODEL.innerWidth/4,0,0));
  const rightEdge=m.innerRightAnchor.localToWorld(new T.Vector3(-MODEL.innerWidth/4,0,0));
  assert.ok(leftEdge.distanceTo(rightEdge)<1e-9,`Page edges must meet at ${angle} degrees in ${orientation}`);
  const turn=-(180-angle)*Math.PI/360;
  const normal=new T.Vector3(Math.sin(turn),0,Math.cos(turn)),across=new T.Vector3(Math.cos(turn),0,-Math.sin(turn));
  const direction=normal.clone().negate().transformDirection(m.root.matrixWorld);
  for(const y of [-MODEL.innerHeight/2+.003,0,MODEL.innerHeight/2-.003])for(const offset of [-.0001,0,.0001]){
   const origin=new T.Vector3(0,y,MODEL.hingeZ).add(normal).addScaledVector(across,offset).applyMatrix4(m.root.matrixWorld);
   const hit=new T.Raycaster(origin,direction).intersectObject(m.root,true)[0];
   assert.ok(m.displays.slice(0,2).includes(hit?.object),`Display must cover the hinge at ${angle} degrees in ${orientation}`);
  }
 }
 m.dispose();
});

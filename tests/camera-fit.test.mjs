import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/assets/three/three.module.min.js';
import {createDuoModel,MODEL,modelRoll} from '../dist/duo-model.mjs';
import {bookCamera,CAMERA_ROTATION_ORDER} from '../dist/camera-motion.mjs';
import {createCameraFit} from '../dist/camera-fit.mjs';

function fixture(){
 const phone=createDuoModel(),orbit=new T.Group(),center=new T.Group();
 orbit.add(center);center.add(phone.root);
 const camera=new T.PerspectiveCamera(32,1,.1,50),fit=createCameraFit(phone.root);
 const vertices=[];
 phone.root.traverse(mesh=>{if(mesh.geometry?.attributes.position)vertices.push({mesh,position:mesh.geometry.attributes.position});});
 function pose(angle,orientation,{pitch,yaw}){
  phone.fold(angle);center.position.set(MODEL.halfWidth*(1-Math.max(0,Math.cos((180-angle)*Math.PI/180)))/2,0,-MODEL.halfWidth*Math.sin((180-angle)*Math.PI/180)/2);
  orbit.rotation.set(pitch,yaw,modelRoll(angle<4?'folded':'open',orientation),CAMERA_ROTATION_ORDER);orbit.updateMatrixWorld(true);
 }
 function extent(aspect,zoom=1){
  camera.aspect=aspect;camera.position.z=fit({aspect,fov:camera.fov,zoom});camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const projected=new T.Vector3();let x=0,y=0;
  for(const {mesh,position}of vertices)for(let i=0;i<position.count;i++){
   projected.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).project(camera);
   x=Math.max(x,Math.abs(projected.x));y=Math.max(y,Math.abs(projected.y));
  }
  return {x,y,distance:camera.position.z};
 }
 return {phone,pose,extent};
}

test('the fully open portrait phone fits wide and narrow stages, including the tabletop zoom',()=>{
 const {phone,pose,extent}=fixture();pose(180,'portrait',{yaw:-.22,pitch:.14});
 for(const aspect of [.55,1,2.37,4])for(const zoom of [1,1.08]){
  const bounds=extent(aspect,zoom);
  assert.ok(bounds.x<.96&&bounds.y<.96,JSON.stringify({aspect,zoom,...bounds}));
 }
 phone.dispose();
});

test('folding and both orientations stay inside the camera while showing either side',()=>{
 const {phone,pose,extent}=fixture();
 for(const angle of [0,60,100,115,150,180])for(const orientation of ['portrait','landscape'])for(const back of [false,true]){
  const front=angle===0?{pitch:.14,yaw:-.22}:bookCamera(angle,orientation);
  pose(angle,orientation,{pitch:front.pitch,yaw:front.yaw+(back?Math.PI:0)});
  for(const aspect of [.65,2.4]){
   const bounds=extent(aspect,1.08);
   assert.ok(bounds.x<.97&&bounds.y<.97,JSON.stringify({angle,orientation,back,aspect,...bounds}));
  }
 }
 phone.dispose();
});

test('intermediate rotations fit throughout a front/back turn',()=>{
 const {phone,pose,extent}=fixture();
 for(let step=0;step<=12;step++){
  pose(180,'portrait',{yaw:-.22+Math.PI*step/12,pitch:.14});
  const bounds=extent(2.4);
  assert.ok(bounds.x<.92&&bounds.y<.92,JSON.stringify({step,...bounds}));
 }
 phone.dispose();
});

test('manual zoom remains proportional to the fitted camera distance',()=>{
 const {phone,pose,extent}=fixture();pose(180,'landscape',{yaw:0,pitch:0});
 const normal=extent(2).distance,closer=extent(2,1.4).distance,further=extent(2,.7).distance;
 assert.ok(Math.abs(closer-normal/1.4)<1e-9);assert.ok(Math.abs(further-normal/.7)<1e-9);
 phone.dispose();
});

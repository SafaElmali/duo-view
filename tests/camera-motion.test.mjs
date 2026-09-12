import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraMove,cameraAt,cameraFlip,cameraShowsBack,bookCamera,cameraReframe,CAMERA_ROTATION_ORDER} from '../dist/camera-motion.mjs';
import {Euler,Vector3} from '../dist/assets/three/three.module.min.js';

const front={yaw:-.26,pitch:-.8,zoom:1};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('reset eases orientation and zoom together and stops at the requested pose',()=>{
 const from={yaw:2,pitch:.5,zoom:1.4},move=cameraMove(from,front,100);
 assert.deepEqual(cameraAt(move,100),{...from,done:false});
 const early=cameraAt(move,170),middle=cameraAt(move,450),end=cameraAt(move,900);
 assert.ok(early.yaw<from.yaw&&early.yaw>middle.yaw);
 close(middle.yaw,(from.yaw+front.yaw)/2);close(middle.zoom,1.2);
 close(end.yaw,front.yaw);close(end.pitch,front.pitch);close(end.zoom,1);assert.equal(end.done,true);
});
test('front/back uses the shortest rotation even after multiple manual turns',()=>{
 const from={...front,yaw:front.yaw+8*Math.PI},move=cameraMove(from,{yaw:Math.PI-.2},0);
 assert.ok(Math.abs(move.to.yaw-from.yaw)<=Math.PI);
 close(Math.cos(move.to.yaw),Math.cos(Math.PI-.2));
 close(cameraAt(move,700).pitch,front.pitch);
});
test('a second button press continues from the displayed pose without a jump',()=>{
 const first=cameraMove(front,{yaw:Math.PI-.2},0),current=cameraAt(first,250);
 const second=cameraMove(current,front,250),start=cameraAt(second,250);
 close(start.yaw,current.yaw);close(start.pitch,current.pitch);close(start.zoom,current.zoom);
 close(Math.cos(cameraAt(second,950).yaw),Math.cos(front.yaw));
});
test('reduced motion reaches the destination immediately',()=>{
 const move=cameraMove({yaw:2,pitch:1,zoom:1.4},front,500,{reducedMotion:true});
 const end=cameraAt(move,500);
 close(end.yaw,front.yaw);close(end.pitch,front.pitch);close(end.zoom,1);assert.equal(end.done,true);
});

test('reset takes the shortest path after multiple vertical rotations',()=>{
 const from={...front,pitch:front.pitch+8*Math.PI+.4};
 const move=cameraMove(from,front,0),end=cameraAt(move,700);
 assert.ok(Math.abs(move.to.pitch-from.pitch)<=Math.PI);
 close(Math.cos(end.pitch),Math.cos(front.pitch));
 close(Math.sin(end.pitch),Math.sin(front.pitch));
 close(cameraAt(move,0).pitch,from.pitch);
});


test('front/back preserves manual tilt and zoom while changing the visible side',()=>{
 for(const pitch of [-.8,.5,Math.PI+.3,8*Math.PI-.8]){
  const from={yaw:-.22,pitch,zoom:1.3};
  const to=cameraFlip(from,-.22);
  close(to.pitch,from.pitch);close(to.zoom,from.zoom);
  assert.notEqual(cameraShowsBack(to),cameraShowsBack(from));
  const returned=cameraFlip(to,-.22);
  close(returned.yaw,from.yaw);close(returned.pitch,from.pitch);
 }
});

test('turntable yaw preserves every point height instead of tilting the rotation axis',()=>{
 for(const roll of [0,Math.PI/2]){
  for(const point of [new Vector3(1,2,.5),new Vector3(-2,0,1)]){
   const start=point.clone().applyEuler(new Euler(-.8,0,roll,CAMERA_ROTATION_ORDER));
   for(const yaw of [Math.PI/4,Math.PI/2,Math.PI]){
    const turned=point.clone().applyEuler(new Euler(-.8,yaw,roll,CAMERA_ROTATION_ORDER));
    close(turned.y,start.y);
   }
  }
 }
});

test('interrupting a flip reverses toward the front without changing tilt or zoom',()=>{
 const from={yaw:0,pitch:-.8,zoom:1.2};
 const first=cameraMove(from,cameraFlip(from),0);
 const current=cameraAt(first,280);
 const second=cameraMove(current,cameraFlip(current,0,first.to),280);
 const start=cameraAt(second,280),end=cameraAt(second,1000);
 close(start.yaw,current.yaw);close(start.pitch,current.pitch);close(start.zoom,current.zoom);
 assert.equal(cameraShowsBack(end),false);close(end.pitch,from.pitch);close(end.zoom,from.zoom);
});


test('book front view faces both display halves equally at different hinge angles',()=>{
 for(const angle of [65,115,150,180]){
  for(const orientation of ['landscape','portrait']){
   const front=bookCamera(angle,orientation),roll=orientation==='portrait'?Math.PI/2:0;
   const rotation=new Euler(front.pitch,front.yaw,roll,CAMERA_ROTATION_ORDER);
   const left=new Vector3(0,0,1).applyEuler(rotation);
   const right=new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),-(180-angle)*Math.PI/180).applyEuler(rotation);
   close(left.z,right.z);
   close(left.x+right.x,0);close(left.y+right.y,0);
   assert.ok(left.z>0);
  }
 }
});

test('book front/back toggles around the hinge-aware front and returns to it',()=>{
 const front=bookCamera(115),back=cameraFlip(front,front.yaw);
 assert.equal(cameraShowsBack(front,front.yaw),false);
 assert.equal(cameraShowsBack(back,front.yaw),true);
 close(back.yaw-front.yaw,Math.PI);
 const returned=cameraAt(cameraMove(back,cameraFlip(back,front.yaw),0),700);
 close(returned.yaw,front.yaw);close(returned.pitch,front.pitch);
});

test('book side selection uses the actual display direction after a manual rotation',()=>{
 const front=bookCamera(115),view={...front,yaw:front.yaw+1.5};
 assert.equal(cameraShowsBack(view,front.yaw),false);
 const next=cameraFlip(view,front.yaw);
 assert.equal(cameraShowsBack(next,front.yaw),true);
});


test('orientation reframing keeps the side and zoom while aiming at the new fold direction',()=>{
 for(const [before,after] of [['landscape','portrait'],['portrait','landscape']]){
  for(const back of [false,true]){
   const previous=bookCamera(115,before),front=bookCamera(115,after);
   const current={...previous,yaw:previous.yaw+(back?Math.PI:0),zoom:1.3};
   const destination=cameraReframe(current,front,back);
   const move=cameraMove(current,destination,0),start=cameraAt(move,0),end=cameraAt(move,700);
   close(start.yaw,current.yaw);close(start.pitch,current.pitch);
   close(end.pitch,front.pitch);close(end.zoom,1.3);
   assert.equal(cameraShowsBack(end,front.yaw),back);
   close(Math.cos(end.yaw-front.yaw),back?-1:1);
  }
 }
});

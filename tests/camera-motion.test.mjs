import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraMove,cameraAt} from '../dist/camera-motion.mjs';

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

import {Vector3} from './assets/three/three.module.min.js';

// Cache each mesh's local bounds. Hinge and camera rotations transform these
// corners, so fitting accounts for depth as well as the visible width and height.
export function createCameraFit(root){
 const bounds=[],point=new Vector3();
 root.traverse(mesh=>{
  if(!mesh.geometry)return;
  mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;
  const corners=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new Vector3(x,y,z));
  bounds.push({mesh,corners});
 });
 return function fitDistance({aspect,fov,zoom=1}){
  const tangent=Math.tan(fov*Math.PI/360);
  const vertical=tangent*.86,horizontal=vertical*aspect;
  // Preserve the existing framing where it fits; pull back when the device grows.
  let distance=Math.max(5,5.3/aspect)/(2*tangent);
  for(const {mesh,corners}of bounds)for(const corner of corners){
   point.copy(corner).applyMatrix4(mesh.matrixWorld);
   distance=Math.max(distance,point.z+Math.abs(point.x)/horizontal,point.z+Math.abs(point.y)/vertical);
  }
  return distance/zoom;
 };
}

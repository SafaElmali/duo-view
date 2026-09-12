// Yaw turns around the scene's upright axis; pitch and display roll stay inside it.
export const CAMERA_ROTATION_ORDER='YXZ';

// The two inner displays fold asymmetrically in model space. Aim at their bisector.
export function bookCamera(foldAngle,orientation='landscape'){
 const halfBend=(180-Math.max(0,Math.min(180,foldAngle)))*Math.PI/360;
 return orientation==='portrait'?{yaw:0,pitch:-halfBend,zoom:1}:{yaw:halfBend,pitch:0,zoom:1};
}

export function cameraShowsBack({yaw,pitch},frontYaw=0){
 return Math.cos(yaw-frontYaw)*Math.cos(pitch)<0;
}

export function cameraFlip(from,frontYaw=0,pending=from){
 const back=cameraShowsBack(pending,frontYaw),upsideDown=Math.cos(from.pitch)<0;
 // Change only the viewing side. A manual tilt or zoom belongs to the user.
 return {...from,yaw:frontYaw+(upsideDown===back?Math.PI:0)};
}

export function cameraReframe(from,front,showBack=false){
 // Orientation changes aim at the new screen arrangement without losing side or zoom.
 return {...front,yaw:front.yaw+(showBack?Math.PI:0),zoom:from.zoom};
}

export function cameraMove(from,to,start,{duration=700,reducedMotion=false}={}){
 const destination={...from,...to};
 // Use the nearest equivalent angle, even after several manual rotations.
 for(const axis of ['yaw','pitch'])destination[axis]=from[axis]+Math.atan2(Math.sin(destination[axis]-from[axis]),Math.cos(destination[axis]-from[axis]));
 return {from:{...from},to:destination,start,duration:reducedMotion?0:duration};
}

export function cameraAt(move,now){
 const progress=move.duration===0?1:Math.max(0,Math.min(1,(now-move.start)/move.duration));
 const eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
 const mix=key=>move.from[key]+(move.to[key]-move.from[key])*eased;
 return {yaw:mix('yaw'),pitch:mix('pitch'),zoom:mix('zoom'),done:progress===1};
}

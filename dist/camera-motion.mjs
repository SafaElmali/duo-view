export function cameraMove(from,to,start,{duration=700,reducedMotion=false}={}){
 const destination={...from,...to};
 // Use the nearest equivalent angle, even after several manual rotations.
 destination.yaw=from.yaw+Math.atan2(Math.sin(destination.yaw-from.yaw),Math.cos(destination.yaw-from.yaw));
 return {from:{...from},to:destination,start,duration:reducedMotion?0:duration};
}

export function cameraAt(move,now){
 const progress=move.duration===0?1:Math.max(0,Math.min(1,(now-move.start)/move.duration));
 const eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
 const mix=key=>move.from[key]+(move.to[key]-move.from[key])*eased;
 return {yaw:mix('yaw'),pitch:mix('pitch'),zoom:mix('zoom'),done:progress===1};
}

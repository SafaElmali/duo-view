const controls='.duo-actions,button,input,select,textarea,a,[contenteditable="true"]';

export function bindCameraGestures(host,{canRotate,onStart,onRotate,onZoom}){
 let drag=null;
 const allowed=event=>canRotate()&&!event.target.closest(controls);
 function down(event){
  if(drag||event.button!==0||event.isPrimary===false||!allowed(event))return;
  event.preventDefault();onStart();
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  host.setPointerCapture(event.pointerId);
 }
 function move(event){
  if(!drag||event.pointerId!==drag.id)return;
  if(!canRotate()){end(event);return;}
  onRotate(event.clientX-drag.x,event.clientY-drag.y);
  drag.x=event.clientX;drag.y=event.clientY;
 }
 function end(event){
  if(!drag||event.pointerId!==drag.id)return;
  const id=drag.id;drag=null;
  if(host.hasPointerCapture(id))host.releasePointerCapture(id);
 }
 function wheel(event){
  // Ordinary wheel/trackpad scrolling never moves the camera.
  if(!event.ctrlKey||!allowed(event)||drag||!event.deltaY)return;
  event.preventDefault();onStart();
  const unit=event.deltaMode===1?16:event.deltaMode===2?host.clientHeight:1;
  const limit=value=>Math.max(-120,Math.min(120,value*unit));
  onZoom(limit(event.deltaY));
 }
 const listeners={pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,lostpointercapture:end,wheel};
 for(const [type,listener]of Object.entries(listeners))host.addEventListener(type,listener,{passive:false});
 return ()=>{
  if(drag)end({pointerId:drag.id});
  for(const [type,listener]of Object.entries(listeners))host.removeEventListener(type,listener);
 };
}

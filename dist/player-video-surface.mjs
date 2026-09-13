// A normal canvas stays in the CSS3D surface; the native video decoder stays
// outside it. Accelerated video layers can otherwise disappear under WebGL.
export function bindVideoSurface(video, canvas) {
 const doc=video.ownerDocument,win=doc.defaultView,ctx=canvas.getContext('2d',{alpha:false});
 let active=false,disposed=false,pending=null,lastTime=-1;
 const videoFrames=typeof video.requestVideoFrameCallback==='function';
 function paint(){
  if(!ctx||disposed||!active||doc.hidden||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
  if(canvas.hidden&&video.paused&&video.currentTime===0)return;
  if(lastTime===video.currentTime&&!canvas.hidden)return;
  try{
   if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
   ctx.drawImage(video,0,0,canvas.width,canvas.height);
   lastTime=video.currentTime;canvas.hidden=false;
  }catch{/* Keep the poster or last decoded frame during a seek or decoder reset. */}
 }
 function stop(){
  if(pending===null)return;
  if(videoFrames)video.cancelVideoFrameCallback(pending);else win.cancelAnimationFrame(pending);
  pending=null;
 }
 function schedule(){
  if(!ctx||disposed||!active||doc.hidden||video.paused||video.ended||pending!==null)return;
  const next=()=>{pending=null;paint();schedule();};
  pending=videoFrames?video.requestVideoFrameCallback(next):win.requestAnimationFrame(next);
 }
 function refresh(){paint();schedule();}
 function pause(){stop();paint();}
 function visibility(){if(doc.hidden)stop();else refresh();}
 const listeners={loadeddata:refresh,seeked:refresh,playing:refresh,play:refresh,pause,ended:pause,error:stop};
 for(const [type,listener]of Object.entries(listeners))video.addEventListener(type,listener);
 doc.addEventListener('visibilitychange',visibility);
 return {
  setActive(value){active=value;if(active)refresh();else stop();},
  dispose(){disposed=true;stop();for(const [type,listener]of Object.entries(listeners))video.removeEventListener(type,listener);doc.removeEventListener('visibilitychange',visibility);}
 };
}

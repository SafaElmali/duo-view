import {track} from './analytics.mjs';
import * as T from './assets/three/three.module.min.js';
import {CSS3DRenderer,CSS3DObject} from './assets/three/CSS3DRenderer.js';
import {createDuoModel,MODEL,modelRoll} from './duo-model.mjs';
import {createDuoPlayer} from './duo-player.mjs?v=3';
import {dimensions} from './simulator.mjs';
import {createSnapshotScroller} from './snapshot-scroll.mjs';
import {cameraMove,cameraAt,cameraFlip,cameraShowsBack,bookCamera,cameraReframe,CAMERA_ROTATION_ORDER} from './camera-motion.mjs';
import {bindCameraGestures} from './camera-gestures.mjs';
import {navigatePreviewFrame} from './preview-frame.mjs';
import {createCameraFit} from './camera-fit.mjs';
export function createDuoViewer(host,{onScrollPreview,onOpenFlat}={}){
 const canvas=host.querySelector('canvas'),surfaceHost=host.querySelector('.duo-web-layer');
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0xffffff,0);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,50);camera.position.set(0,0,10);camera.lookAt(0,0,0);
 const orbit=new T.Group();scene.add(orbit);const center=new T.Group();orbit.add(center);const phone=createDuoModel();center.add(phone.root);
 const fitCamera=createCameraFit(phone.root);
 scene.add(new T.HemisphereLight(0xffffff,0x8090a7,3));const key=new T.DirectionalLight(0xffffff,3);key.position.set(-4,6,5);scene.add(key);
 const env=new T.Scene();env.background=new T.Color('#b8c2d3');for(const [x,y,z,w,h,d,c] of [[-4,2,2,2,7,4,'#ffffff'],[4,3,0,2,8,6,'#f0f6ff'],[0,5,-2,9,1,7,'#ffffff'],[0,-3,0,8,1,8,'#4c5569'],[0,0,-5,7,7,1,'#192338']]){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:c}));m.position.set(x,y,z);env.add(m);}const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(env,.06);scene.environment=environment.texture;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const textureCanvas=document.createElement('canvas');textureCanvas.width=1536;textureCanvas.height=1080;const ctx=textureCanvas.getContext('2d');const bg=ctx.createLinearGradient(0,0,1536,1080);bg.addColorStop(0,'#09192f');bg.addColorStop(1,'#17103f');ctx.fillStyle=bg;ctx.fillRect(0,0,1536,1080);ctx.save();ctx.translate(768,540);ctx.rotate(-.55);for(const [x,rx,color]of[[-230,470,'#96d9ff'],[400,380,'#d3b4ee']]){const g=ctx.createLinearGradient(x-450,-700,x+400,600);g.addColorStop(0,color);g.addColorStop(.55,'#4961b3');g.addColorStop(1,'#c2d8fe');ctx.strokeStyle=g;ctx.lineWidth=150;ctx.shadowColor=color;ctx.shadowBlur=40;ctx.beginPath();ctx.ellipse(x,30,rx,840,0,0,Math.PI*2);ctx.stroke();}ctx.restore();const wallpaper=new T.CanvasTexture(textureCanvas);wallpaper.colorSpace=T.SRGBColorSpace;
 phone.displays.forEach((mesh,index)=>{const texture=wallpaper.clone();if(index<2){texture.repeat.x=.5;texture.offset.x=index*.5;}mesh.material.dispose();mesh.material=new T.MeshBasicMaterial({map:texture,toneMapped:false});});
 const wallpaperMaterials=phone.displays.map(mesh=>mesh.material);const screenCutout=new T.MeshBasicMaterial({color:0x000000,opacity:0,blending:T.NoBlending,depthWrite:true});
 const cssRenderer=new CSS3DRenderer();cssRenderer.domElement.classList.add('duo-css-scene');surfaceHost.append(cssRenderer.domElement);const cssScene=new T.Scene();
 const web=document.createElement('div');web.className='duo-live-screen';web.innerHTML='<div class="browser-chrome" hidden><div class="status-bar"><span>9:41</span><span class="status-camera"></span><span>▰</span></div><div class="browser-address"><span>aA</span><span class="duo-live-host">Demo website</span><span>↻</span></div></div><iframe title="Website on the 3D iPhone Duo" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="browser-bottom" hidden><span></span></div><span class="duo-live-hinge" aria-hidden="true"></span>';
 const iframe=web.querySelector('iframe');const cssObject=new CSS3DObject(web);cssScene.add(cssObject);
 const splitSurfaces=[0,1].map(index=>{const clip=document.createElement('div');clip.className='duo-split-screen';const page=web.cloneNode(true);page.className='duo-split-page';page.querySelector('.duo-live-hinge').remove();page.querySelector('iframe').title=`Website ${index===0?'first':'second'} half`;clip.append(page);const object=new CSS3DObject(clip);cssScene.add(object);return {clip,page,object,iframe:page.querySelector('iframe')};});
 const snapshotScroll=createSnapshotScroller([iframe,...splitSurfaces.map(surface=>surface.iframe)]);
 const player=createDuoPlayer();host.append(player.video);const cover=document.createElement('div');cover.className='duo-player-cover';web.append(cover);
 const fallback=host.querySelector('.duo-model-message'),backButton=host.querySelector('.duo-back');
 const hint=document.createElement('span'),openFlat=document.createElement('button');
 openFlat.type='button';openFlat.className='duo-open-flat';openFlat.textContent='Open flat';openFlat.hidden=true;
 openFlat.addEventListener('click',()=>onOpenFlat?.());fallback.replaceChildren(hint,openFlat);
 let state=null,angle=180,target=180,roll=0,targetRoll=0,yaw=-.22,pitch=.14,zoom=1,active=false,frame=0,last=0,interact=false,live=false,disposed=false,cameraAnimation=null;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const getMode=()=>angle<4?'folded':'open';
 const playingDemo=()=>state?.content==='player';
 const snapshotMode=()=>Boolean(state?.snapshotPage)&&!playingDemo();
 function defaultCamera(){
  if(target>=4&&(state?.pose==='book'||state?.pose==='tabletop')){
   const front=bookCamera(target,state.orientation);
   if(state.pose==='tabletop'){front.pitch-=.1;front.zoom=1.08;}
   return front;
  }
  return {yaw:-.22,pitch:.14,zoom:1};
 }
 function syncCameraButton(){
  const back=cameraShowsBack(cameraAnimation?.to??{yaw,pitch},defaultCamera().yaw);
  backButton.setAttribute('aria-pressed',String(back));
  backButton.title=back?'Back view · Click to show front':'Front view · Click to show back';
 }
 function animateCamera(destination,immediate=false){
  cameraAnimation=cameraMove({yaw,pitch,zoom},destination,performance.now(),{reducedMotion:reduce||immediate});syncCameraButton();wake();
 }
 function poseCamera(immediate=false,showBack=false){const front=defaultCamera();animateCamera(immediate?front:cameraReframe({zoom},front,showBack),immediate);}
 function wake(){if(active&&!frame&&!document.hidden&&!disposed)frame=requestAnimationFrame(render);}
 function cameraDistance(){camera.position.z=fitCamera({aspect:camera.aspect,fov:camera.fov,zoom});}
 function resize(){const width=host.clientWidth,height=Math.max(180,host.clientHeight-105);if(width<1||height<1)return;canvas.style.height=`${height}px`;surfaceHost.style.height=`${height}px`;renderer.setSize(width,height,false);cssRenderer.setSize(width,height);camera.aspect=width/height;cameraDistance();camera.updateProjectionMatrix();wake();}
 function mount(parent,element){if(element.parentNode!==parent)parent.append(element);}
 function syncSplit(size){
  const portrait=state.orientation==='portrait',isPlayer=playingDemo(),show=getMode()==='open'&&(isPlayer||(live&&angle>4&&angle<179.2));
  const cropW=portrait?size.width:size.width/2,cropH=portrait?size.height/2:size.height;
  splitSurfaces.forEach(({clip,page,object,iframe:part},index)=>{
   const anchor=index===0?phone.innerLeftAnchor:phone.innerRightAnchor;
   anchor.getWorldPosition(object.position);anchor.getWorldQuaternion(object.quaternion);
   if(portrait)object.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-Math.PI/2));
   object.scale.set((portrait?MODEL.innerHeight:MODEL.innerWidth/2)/cropW,(portrait?MODEL.innerWidth/2:MODEL.innerHeight)/cropH,1);
   clip.style.width=`${cropW}px`;clip.style.height=`${cropH}px`;clip.style.borderRadius=portrait?(index===0?'0 0 29px 29px':'29px 29px 0 0'):(index===0?'29px 0 0 29px':'0 29px 29px 0');
   const normal=new T.Vector3(0,0,1).applyQuaternion(object.quaternion),visible=show&&normal.dot(camera.position.clone().sub(object.position))>0;
   clip.style.visibility=visible?'visible':'hidden';clip.classList.toggle('duo-interactive',(isPlayer||snapshotMode())&&interact);clip.classList.toggle('is-player',isPlayer);clip.classList.toggle('is-snapshot',snapshotMode());part.tabIndex=visible&&interact?0:-1;
   page.hidden=isPlayer;page.style.width=`${size.width}px`;page.style.height=`${size.height}px`;page.style.transform=`translate(${portrait?0:-index*cropW}px,${portrait&&index===0?-cropH:0}px)`;
   part.width=String(size.width);part.height=String(size.contentHeight);part.style.height=`${size.contentHeight}px`;page.querySelectorAll('.browser-chrome,.browser-bottom').forEach(element=>element.hidden=!state.chrome);page.querySelector('.duo-live-host').textContent=state.demo?'Demo website':new URL(state.url).hostname;
   if(isPlayer&&getMode()==='open'){const element=(portrait?index===1:index===0)?player.top:player.bottom;mount(clip,element);}
  });
 }
 function syncWeb(){
  if(!state)return;const mode=getMode(),isOpen=mode==='open';const size=dimensions(mode,state.orientation,state.chrome,state.custom);host.classList.toggle('is-flat',angle>179.2);
  const nativeWidth=isOpen?MODEL.innerWidth:MODEL.outerWidth,nativeHeight=isOpen?MODEL.innerHeight:MODEL.outerHeight;
  const rotated=(isOpen&&state.orientation==='portrait')||(!isOpen&&state.orientation==='landscape');
  const w=rotated?nativeHeight:nativeWidth,h=rotated?nativeWidth:nativeHeight;
  web.style.width=`${size.width}px`;web.style.height=`${size.height}px`;web.style.borderRadius=`${isOpen?29:31}px`;
  iframe.width=String(size.width);iframe.height=String(size.contentHeight);iframe.style.height=`${size.contentHeight}px`;web.querySelectorAll('.browser-chrome,.browser-bottom').forEach(element=>element.hidden=!state.chrome);web.querySelector('.duo-live-host').textContent=state.demo?'Demo website':new URL(state.url).hostname;
  const anchor=isOpen?phone.innerAnchor:phone.outerAnchor;
  anchor.getWorldPosition(cssObject.position);anchor.getWorldQuaternion(cssObject.quaternion);
  const contentRotation=state.orientation==='portrait'&&isOpen?-Math.PI/2:state.orientation==='landscape'&&!isOpen?Math.PI/2:0;
  cssObject.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),contentRotation));
  cssObject.scale.set(w/size.width,h/size.height,1);
  const normal=new T.Vector3(0,0,1).applyQuaternion(cssObject.quaternion),toCamera=camera.position.clone().sub(cssObject.position);
  const endpoint=(angle<.8||angle>179.2)&&Math.abs(roll-targetRoll)<.015;
  const isPlayer=playingDemo();player.top.hidden=!isPlayer;player.bottom.hidden=!isPlayer;
  web.style.visibility=(isPlayer?angle<.8:live&&endpoint)&&normal.dot(toCamera)>0?'visible':'hidden';
  iframe.hidden=isPlayer;cover.hidden=!isPlayer;web.classList.toggle('is-player',isPlayer);
  if(isPlayer&&!isOpen){mount(cover,player.top);mount(cover,player.bottom);}
  syncSplit(dimensions('open',state.orientation,state.chrome,state.custom));
  // Punch depth-tested windows through the WebGL frame, so the frame can occlude the live screen.
  const cutoutVisible=isPlayer?(isOpen||angle<.8):live&&(endpoint||(angle>4&&angle<179.2));
  phone.displays.forEach((mesh,index)=>{const cutout=cutoutVisible&&(isOpen?index<2:index===2);mesh.material=cutout?screenCutout:wallpaperMaterials[index];mesh.renderOrder=cutout?10:0;});
  web.classList.toggle('duo-interactive',interact);
  iframe.tabIndex=web.style.visibility==='visible'&&interact?0:-1;
  web.querySelector('.duo-live-hinge').hidden=!isOpen||!state.hinge;web.querySelector('.duo-live-hinge').classList.toggle('horizontal',state.orientation==='portrait');
 }
 function render(now){frame=0;if(!active||disposed)return;
  if(cameraAnimation){const next=cameraAt(cameraAnimation,now);yaw=next.yaw;pitch=next.pitch;zoom=next.zoom;cameraDistance();if(next.done)cameraAnimation=null;}
  syncCameraButton();
  const dt=Math.min((now-last)/1000,.05);last=now;const speed=reduce?1:1-Math.exp(-11*dt);angle=T.MathUtils.lerp(angle,target,speed);roll=T.MathUtils.lerp(roll,targetRoll,speed);if(Math.abs(angle-target)<.015)angle=target;if(Math.abs(roll-targetRoll)<.001)roll=targetRoll;phone.fold(angle);center.position.x=MODEL.halfWidth*(1-Math.max(0,Math.cos((180-angle)*Math.PI/180)))/2;center.position.z=-MODEL.halfWidth*Math.sin((180-angle)*Math.PI/180)/2;orbit.rotation.set(pitch,yaw,roll,CAMERA_ROTATION_ORDER);scene.updateMatrixWorld(true);cameraDistance();camera.updateMatrixWorld();syncWeb();renderer.render(scene,camera);cssRenderer.render(cssScene,camera);host.dataset.rendered='true';if(cameraAnimation||Math.abs(angle-target)>.01||Math.abs(roll-targetRoll)>.001)wake();}
 function bentWebsite(){return live&&!snapshotMode()&&!playingDemo()&&target>1&&target<179;}
 function interactionLabel(){
  if(snapshotMode()&&state.snapshot?.pending)return 'Preparing preview…';
  if(snapshotMode()&&state.snapshot?.error)return 'Try snapshot again';
  if(bentWebsite())return state.canSnapshot?'Scroll preview':'Use website';
  return interact?'Rotate model':snapshotMode()?'Scroll preview':playingDemo()?'Use player':'Use website';
 }
 function syncInteraction(){
  const button=host.querySelector('.duo-interact'),busy=snapshotMode()&&Boolean(state.snapshot?.pending);
  button.disabled=busy||!snapshotMode()&&!playingDemo()&&!live;
  button.classList.toggle('preview-action',bentWebsite()||Boolean(snapshotMode()&&state.snapshot?.error));
  button.setAttribute('aria-busy',String(busy));button.setAttribute('aria-pressed',String(interact));button.textContent=interactionLabel();
  host.classList.toggle('use-website',interact);message();wake();
 }
 function message(){
  openFlat.hidden=true;
  if(snapshotMode()){
   if(state.snapshot?.pending)hint.textContent='Preparing your scrollable snapshot…';
   else if(state.snapshot?.error){hint.textContent='Snapshot unavailable. Try again, or use a live website. ';openFlat.hidden=false;}
   else hint.textContent=interact?'Snapshot · scroll only. Scroll or swipe on either screen.':'Snapshot · scroll only. Choose “Scroll preview” to explore the page.';
  }else if(playingDemo())hint.textContent=interact?'Touch and drag or click and drag the video to rotate · Playback controls stay active.':'Touch and drag or click and drag to rotate · Choose “Use player” for playback controls.';
  else if(bentWebsite()&&state.canSnapshot){hint.textContent='Scroll this view using a snapshot. Want to click links? ';openFlat.hidden=false;}
  else if(bentWebsite())hint.textContent='“Use website” opens this page flat for scrolling and clicking.';
  else if(live)hint.textContent=interact?'Live website · Scroll and click on the website. Choose “Rotate model” to turn the phone.':'Live website · Choose “Use website” to scroll and click.';
  else hint.textContent='Enter a website URL to preview it on the phone.';
  const button=host.querySelector('.duo-interact');button.title=button.disabled?hint.textContent:'';
 }
 function update(next){
  const previousPose=state?.pose,orientationChanged=Boolean(state)&&state.orientation!==next.orientation;
  const wasBack=cameraShowsBack(cameraAnimation?.to??{yaw,pitch},defaultCamera().yaw),wasPlayer=playingDemo(),wasSnapshot=snapshotMode();
  state={...next};target=next.foldAngle??(next.display==='folded'?0:180);targetRoll=modelRoll(next.display,next.orientation);phone.finish(next.finish||'white');
  if(previousPose!==state.pose||orientationChanged)poseCamera(previousPose===undefined,previousPose===state.pose&&wasBack);
  if(snapshotMode()&&!wasSnapshot||playingDemo()&&!wasPlayer)interact=true;
  if(!snapshotMode()&&!playingDemo()&&target>1&&target<179)interact=false;
  snapshotScroll.update(snapshotMode()?next.snapshot:null);
  if(wasPlayer&&!playingDemo())player.pause();
  player.setActive(active&&playingDemo());
  live=next.demo||next.mode==='embedded'||snapshotMode();const src=live&&!playingDemo()?next.url:'about:blank';
  function source(frame,enabled){
   navigatePreviewFrame(frame,{url:enabled?src:'about:blank',html:snapshotMode()&&enabled?next.snapshotPage:null,onTimeout:next.onPreviewTimeout});
  }
  source(iframe,true);for(const surface of splitSurfaces)source(surface.iframe,snapshotMode()||target>1&&target<179);
  host.classList.toggle('has-player',playingDemo());syncInteraction();}
 function setActive(value){active=value;player.setActive(active&&playingDemo());if(!active){player.pause();if(frame){cancelAnimationFrame(frame);frame=0;}}surfaceHost.hidden=!active;if(active)resize();}
 function reset(){animateCamera(defaultCamera());}
 function useWebsite(){
  if(!live||snapshotMode()||playingDemo()||bentWebsite())return;
  interact=true;syncInteraction();
 }
 function getCamera(){return {...(cameraAnimation?.to??{yaw,pitch,zoom})};}
 function restoreCamera(value){
  if(!value||![value.yaw,value.pitch,value.zoom].every(Number.isFinite)||value.zoom<.7||value.zoom>1.4)return;
  cameraAnimation=null;({yaw,pitch,zoom}=value);cameraDistance();syncCameraButton();wake();
 }
 function startPlayer(){
  if(!playingDemo())return;
  interact=true;host.classList.add('use-website');
  const button=host.querySelector('.duo-interact');button.setAttribute('aria-pressed','true');button.textContent=interactionLabel();
  message();wake();player.start();
 }
 canvas.tabIndex=0;canvas.setAttribute('aria-label','3D iPhone Duo. Touch and drag or click and drag to rotate. Pinch to zoom. Arrow keys rotate and tilt. Home resets the view.');
 const removeGestures=bindCameraGestures(host,{
  canRotate:()=>active&&(!interact||playingDemo()),
  onStart:()=>{cameraAnimation=null;canvas.focus({preventScroll:true});},
  onRotate:(dx,dy)=>{track('duo_model_rotated',{input:'pointer'},1500);cameraAnimation=null;yaw+=dx*.009;pitch+=dy*.007;wake();},
  onZoom:delta=>{track('duo_model_zoomed',{input:'pointer'},1500);zoom=T.MathUtils.clamp(zoom*Math.exp(-delta*.01),.7,1.4);cameraDistance();wake();}
 });
 canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(event.key))return;event.preventDefault();track(event.key==='Home'?'duo_camera_reset':event.key==='+'||event.key==='-'?'duo_model_zoomed':'duo_model_rotated',{input:'keyboard'},1500);cameraAnimation=null;if(event.key==='ArrowLeft')yaw-=.16;if(event.key==='ArrowRight')yaw+=.16;if(event.key==='ArrowUp')pitch-=.12;if(event.key==='ArrowDown')pitch+=.12;if(event.key==='Home')reset();if(event.key==='+')zoom=Math.min(1.4,zoom+.1);if(event.key==='-')zoom=Math.max(.7,zoom-.1);resize();});
 host.querySelector('.duo-reset').addEventListener('click',reset);
 backButton.addEventListener('click',()=>{const current={yaw,pitch,zoom};animateCamera(cameraFlip(current,defaultCamera().yaw,cameraAnimation?.to??current));interact=false;host.classList.remove('use-website');host.querySelector('.duo-interact').setAttribute('aria-pressed','false');host.querySelector('.duo-interact').textContent=interactionLabel();message();wake();});
 host.querySelector('.duo-interact').addEventListener('click',()=>{
  if(bentWebsite()){if(state.canSnapshot)onScrollPreview?.();else onOpenFlat?.();return;}
  if(snapshotMode()&&state.snapshot?.error){onScrollPreview?.();return;}
  interact=!interact;syncInteraction();
 });
 new ResizeObserver(resize).observe(host);document.addEventListener('visibilitychange',wake);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();active=false;surfaceHost.hidden=true;fallback.textContent='3D graphics paused. Reload to restore, or use the 2D preview.';});
 return {update,setActive,reset,startPlayer,useWebsite,getCamera,restoreCamera,reload(){if(playingDemo()){player.video.currentTime=0;player.pause();}else if(state){for(const frame of [iframe,...splitSurfaces.map(surface=>surface.iframe)])if(frame===iframe||frame.getAttribute('src')!=='about:blank')navigatePreviewFrame(frame,{url:live?state.url:'about:blank',onTimeout:state.onPreviewTimeout,force:true});}},getState:()=>({requestedAngle:Math.round(target),angle:Math.round(angle),display:getMode(),orientation:state?.orientation,finish:state?.finish||'white',liveWebsite:live&&!playingDemo()&&!snapshotMode(),snapshot:snapshotMode(),snapshotScroll:snapshotMode()?snapshotScroll.getState():null,splitWebsite:live&&!playingDemo()&&!snapshotMode()&&target>1&&target<179,pose:state?.pose,player:playingDemo()?player.getState():null,rendered:host.dataset.rendered==='true'}),dispose(){disposed=true;player.dispose();removeGestures();cancelAnimationFrame(frame);snapshotScroll.dispose();phone.dispose();wallpaper.dispose();environment.dispose();renderer.dispose();}};
}

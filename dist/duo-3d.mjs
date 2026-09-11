import * as T from './assets/three/three.module.min.js';
import {CSS3DRenderer,CSS3DObject} from './assets/three/CSS3DRenderer.js';
import {createDuoModel,MODEL,modelRoll} from './duo-model.mjs';
import {createDuoPlayer} from './duo-player.mjs?v=2';
import {dimensions} from './simulator.mjs';
import {createSnapshotScroller} from './snapshot-scroll.mjs';
export function createDuoViewer(host){
 const canvas=host.querySelector('canvas'),surfaceHost=host.querySelector('.duo-web-layer');
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0xffffff,0);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,50);camera.position.set(0,0,10);camera.lookAt(0,0,0);
 const orbit=new T.Group();scene.add(orbit);const center=new T.Group();orbit.add(center);const phone=createDuoModel();center.add(phone.root);
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
 const player=createDuoPlayer();const cover=document.createElement('div');cover.className='duo-player-cover';web.append(cover);
 const fallback=host.querySelector('.duo-model-message');
 let state=null,angle=180,target=180,roll=0,targetRoll=0,yaw=-.22,pitch=.14,zoom=1,active=false,frame=0,last=0,drag=null,interact=false,live=false,disposed=false;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const getMode=()=>angle<4?'folded':'open';
 const playingDemo=()=>state?.content==='player';
 const snapshotMode=()=>Boolean(state?.snapshotPage)&&!playingDemo();
 function poseCamera(){yaw=state?.pose==='tabletop'?-.26:-.22;pitch=state?.pose==='tabletop'?-.8:.14;}
 function wake(){if(active&&!frame&&!document.hidden&&!disposed)frame=requestAnimationFrame(render);}
 function resize(){const width=host.clientWidth,height=Math.max(180,host.clientHeight-105);if(width<1||height<1)return;canvas.style.height=`${height}px`;surfaceHost.style.height=`${height}px`;renderer.setSize(width,height,false);cssRenderer.setSize(width,height);camera.aspect=width/height;camera.position.z=Math.max(5.0,5.3/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))/zoom;camera.updateProjectionMatrix();wake();}
 function mount(parent,element){if(element.parentNode===parent)return;const resume=!player.video.paused;parent.append(element);if(resume)player.video.play().catch(()=>{});}
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
   part.width=String(size.width);part.height=String(size.contentHeight);part.style.height=`${size.contentHeight}px`;page.querySelectorAll('.browser-chrome,.browser-bottom').forEach(element=>element.hidden=!state.chrome);
   if(isPlayer&&getMode()==='open'){const element=(portrait?index===1:index===0)?player.top:player.bottom;mount(clip,element);}
  });
 }
 function syncWeb(){
  if(!state)return;const mode=getMode(),isOpen=mode==='open';const size=dimensions(mode,state.orientation,state.chrome,state.custom);
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
 function render(now){frame=0;if(!active||disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;const speed=reduce?1:1-Math.exp(-11*dt);angle=T.MathUtils.lerp(angle,target,speed);roll=T.MathUtils.lerp(roll,targetRoll,speed);if(Math.abs(angle-target)<.015)angle=target;if(Math.abs(roll-targetRoll)<.001)roll=targetRoll;phone.fold(angle);center.position.x=MODEL.halfWidth*(1-Math.max(0,Math.cos((180-angle)*Math.PI/180)))/2;center.position.z=-MODEL.halfWidth*Math.sin((180-angle)*Math.PI/180)/2;orbit.rotation.set(pitch,yaw,roll);scene.updateMatrixWorld(true);syncWeb();renderer.render(scene,camera);cssRenderer.render(cssScene,camera);host.dataset.rendered='true';if(Math.abs(angle-target)>.01||Math.abs(roll-targetRoll)>.001)wake();}
 function interactionLabel(){return interact?'Rotate model':snapshotMode()?'Scroll preview':playingDemo()?'Use player':'Use website';}
 function message(){if(snapshotMode()){fallback.textContent=interact?'Scroll or swipe on either screen · Both halves move together.':'Drag to rotate · Choose “Scroll preview” to explore the page.';return;}fallback.textContent=playingDemo()?(interact?'Play, pause, and scrub on the lower screen.':'Drag to rotate · Choose “Use player” for playback controls.'):(live?(target>1&&target<179?'Two page views across the bend. Open flat to interact.':'Drag to rotate. Choose “Use website” to interact.'):'Enter a website URL to preview it on the phone.');}
 function update(next){const previousPose=state?.pose,wasPlayer=playingDemo(),wasSnapshot=snapshotMode();state={...next};target=next.foldAngle??(next.display==='folded'?0:180);targetRoll=modelRoll(next.display,next.orientation);phone.finish(next.finish||'white');if(previousPose!==state.pose)poseCamera();
  if(snapshotMode()&&!wasSnapshot||playingDemo()&&!wasPlayer)interact=true;
  if(!snapshotMode()&&!playingDemo()&&target>1&&target<179)interact=false;
  snapshotScroll.update(snapshotMode()?next.snapshot:null);
  if(wasPlayer&&!playingDemo())player.pause();
  live=next.demo||next.mode==='embedded'||snapshotMode();const src=live&&!playingDemo()?next.url:'about:blank';
  function source(frame,enabled){
   if(snapshotMode()&&enabled){if(frame.getAttribute('src')!=='about:blank')frame.src='about:blank';if(frame.srcdoc!==next.snapshotPage)frame.srcdoc=next.snapshotPage;}
   else{frame.removeAttribute('srcdoc');const targetSrc=enabled?src:'about:blank';if(frame.getAttribute('src')!==targetSrc)frame.src=targetSrc;}
  }
  source(iframe,true);for(const surface of splitSurfaces)source(surface.iframe,snapshotMode()||target>1&&target<179);
  const button=host.querySelector('.duo-interact');button.disabled=!snapshotMode()&&!playingDemo()&&(!live||target>1&&target<179);button.setAttribute('aria-pressed',String(interact));button.textContent=interactionLabel();host.classList.toggle('use-website',interact);message();wake();}
 function setActive(value){active=value;if(!active){player.pause();if(frame){cancelAnimationFrame(frame);frame=0;}}surfaceHost.hidden=!active;if(active)resize();}
 function reset(){poseCamera();zoom=1;resize();}
 function startPlayer(){
  if(!playingDemo())return;
  interact=true;host.classList.add('use-website');
  const button=host.querySelector('.duo-interact');button.setAttribute('aria-pressed','true');button.textContent=interactionLabel();
  message();wake();player.start();
 }
 canvas.tabIndex=0;canvas.setAttribute('aria-label','3D iPhone Duo. Drag to rotate. Arrow keys rotate and tilt. Home resets the view.');
 canvas.addEventListener('pointerdown',event=>{if(interact)return;drag={x:event.clientX,y:event.clientY,yaw,pitch};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{if(!drag)return;yaw=drag.yaw+(event.clientX-drag.x)*.009;pitch=T.MathUtils.clamp(drag.pitch+(event.clientY-drag.y)*.007,-1.15,1.15);wake();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
 canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft')yaw-=.16;if(event.key==='ArrowRight')yaw+=.16;if(event.key==='ArrowUp')pitch=Math.max(-1.15,pitch-.12);if(event.key==='ArrowDown')pitch=Math.min(1.15,pitch+.12);if(event.key==='Home')reset();if(event.key==='+')zoom=Math.min(1.4,zoom+.1);if(event.key==='-')zoom=Math.max(.7,zoom-.1);resize();});
 host.querySelector('.duo-reset').addEventListener('click',reset);
 host.querySelector('.duo-back').addEventListener('click',()=>{yaw=Math.abs(yaw)<1?Math.PI-.2:-.22;interact=false;host.classList.remove('use-website');host.querySelector('.duo-interact').setAttribute('aria-pressed','false');host.querySelector('.duo-interact').textContent=interactionLabel();message();wake();});
 host.querySelector('.duo-interact').addEventListener('click',event=>{interact=!interact;host.classList.toggle('use-website',interact);event.currentTarget.setAttribute('aria-pressed',String(interact));event.currentTarget.textContent=interactionLabel();message();wake();});
 new ResizeObserver(resize).observe(host);document.addEventListener('visibilitychange',wake);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();active=false;surfaceHost.hidden=true;fallback.textContent='3D graphics paused. Reload to restore, or use the 2D preview.';});
 return {update,setActive,reset,startPlayer,reload(){if(playingDemo()){player.video.currentTime=0;player.pause();}else if(state){iframe.src=live?state.url:'about:blank';for(const surface of splitSurfaces)if(surface.iframe.getAttribute('src')!=='about:blank')surface.iframe.src=state.url;}},getState:()=>({requestedAngle:Math.round(target),angle:Math.round(angle),display:getMode(),orientation:state?.orientation,finish:state?.finish||'white',liveWebsite:live&&!playingDemo()&&!snapshotMode(),snapshot:snapshotMode(),snapshotScroll:snapshotMode()?snapshotScroll.getState():null,splitWebsite:live&&!playingDemo()&&!snapshotMode()&&target>1&&target<179,pose:state?.pose,player:playingDemo()?player.getState():null,rendered:host.dataset.rendered==='true'}),dispose(){disposed=true;cancelAnimationFrame(frame);snapshotScroll.dispose();phone.dispose();wallpaper.dispose();environment.dispose();renderer.dispose();}};
}

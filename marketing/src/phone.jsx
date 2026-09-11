import React,{useMemo,useEffect,useLayoutEffect,useRef} from 'react';
import {ThreeCanvas,useOffthreadVideoTexture,useVideoTexture} from '@remotion/three';
import {useLoader,useThree} from '@react-three/fiber';
import {useCurrentFrame,staticFile,interpolate,useRemotionEnvironment,Html5Video,Freeze} from 'remotion';
import * as T from 'three';
import {createDuoModel,MODEL} from './duo-model.mjs';

export const ease=(frame,start,end,from,to)=>interpolate(frame,[start,end],[from,to],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:t=>t*t*(3-2*t)});
const makeCanvas=(w,h)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;};

function StudioLight(){
 const {gl,scene}=useThree();
 const environment=useMemo(()=>{
  const room=new T.Scene();room.background=new T.Color('#8396b1');
  for(const [x,y,z,w,h,d,color]of[[-4,2,2,2,7,4,'#ffffff'],[4,3,0,2,8,6,'#e3edff'],[0,5,-2,9,1,7,'#ffffff'],[0,-3,0,8,1,8,'#384254'],[0,0,-5,7,7,1,'#131c2c']]){
   const box=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color}));box.position.set(x,y,z);room.add(box);
  }
  const pmrem=new T.PMREMGenerator(gl),env=pmrem.fromScene(room,0);pmrem.dispose();
  room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});return env;
 },[gl]);
 useEffect(()=>{scene.environment=environment.texture;return()=>{scene.environment=null;environment.dispose();};},[environment,scene]);
 return <><hemisphereLight args={['#ffffff','#6588be',3]}/><directionalLight position={[-4,6,5]} intensity={4}/><directionalLight position={[5,1,3]} intensity={2} color="#bad3ff"/></>;
}

function round(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function text(ctx,value,x,y,size,color='#fff',weight=400){ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=color;ctx.fillText(value,x,y);}

function paintPlayer(ctx,image,frame){
 ctx.fillStyle='#090e19';ctx.fillRect(0,0,626,890);
 if(image){
  const w=image.videoWidth||image.naturalWidth||image.width,h=image.videoHeight||image.naturalHeight||image.height;
  const crop=w/h>626/445?h*626/445:w,vertical=w/h>626/445?h:w*445/626;
  ctx.drawImage(image,(w-crop)/2,(h-vertical)/2,crop,vertical,0,0,626,445);
 }
 const shade=ctx.createLinearGradient(0,0,0,150);shade.addColorStop(0,'#050811dd');shade.addColorStop(1,'#05081100');ctx.fillStyle=shade;ctx.fillRect(0,0,626,150);
 text(ctx,'DUO CINEMA',28,42,17,'#fff',700);text(ctx,'9:41',535,42,14,'#fff',600);
 const bg=ctx.createLinearGradient(0,445,626,890);bg.addColorStop(0,'#1b2d4b');bg.addColorStop(1,'#253c5a');ctx.fillStyle=bg;ctx.fillRect(0,445,626,445);
 text(ctx,'D',28,507,39,'#ff4054',800);text(ctx,'Sintel',78,493,22,'#fff',700);text(ctx,'Blender Open Movie · Official teaser',78,519,13,'#b0bed3');
 round(ctx,538,470,58,55,12,'#344b6d');text(ctx,frame>135?'✓':'⌑',555,505,26,'#fff',500);
 const buttonY=546;round(ctx,27,buttonY,166,139,14,'#334c70');round(ctx,204,buttonY,219,139,14,frame>40&&frame<54?'#4c73ae':'#3c587f');round(ctx,434,buttonY,165,139,14,'#334c70');
 text(ctx,'↶',85,613,48,'#fff');text(ctx,'10',98,642,19,'#fff',700);text(ctx,'↷',489,613,48,'#fff');text(ctx,'10',504,642,19,'#fff',700);
 const paused=frame<42;ctx.fillStyle='#fff';if(paused){ctx.beginPath();ctx.moveTo(304,585);ctx.lineTo(304,643);ctx.lineTo(346,614);ctx.fill();}else{ctx.fillRect(296,585,13,58);ctx.fillRect(327,585,13,58);}
 const progress=frame<42?.12:frame<105?.12+(frame-42)/500:.55+(frame-105)/500;
 round(ctx,29,714,570,6,3,'#7d8fa9');round(ctx,29,714,570*progress,6,3,'#fa3b53');ctx.fillStyle='#fa3b53';ctx.beginPath();ctx.arc(29+570*progress,717,9,0,Math.PI*2);ctx.fill();
 text(ctx,frame<105?'0:08':'0:28',29,745,12,'#c1cce0');text(ctx,'0:52',566,745,12,'#c1cce0');
 for(let i=0;i<4;i++)round(ctx,27+i*146,766,134,59,12,i===0&&frame>120?'#51719c':'#344b6d');
 text(ctx,frame>120?'1.25×':'1×',73,803,19,'#fff',600);text(ctx,'☀',222,803,27,'#fff');text(ctx,'♪',369,803,26,'#fff');text(ctx,'⛶',514,803,26,'#fff');
 text(ctx,'Sintel © Blender Foundation · CC BY 3.0',169,857,10,'#acbcd2');round(ctx,268,874,90,4,2,'#ffffffb0');
 // A small tap ring makes the demonstrated interaction legible at social-video sizes.
 if(frame>=36&&frame<62){const r=ease(frame,36,62,12,52);ctx.strokeStyle=`rgba(255,255,255,${1-(frame-36)/26})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(318,615,r,0,Math.PI*2);ctx.stroke();}
 if(frame>=100&&frame<123){ctx.strokeStyle=`rgba(255,255,255,${1-(frame-100)/23})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(29+570*progress,717,ease(frame,100,123,12,39),0,Math.PI*2);ctx.stroke();}
}

function Device({fold,roll,yaw,pitch,zoom=1,orientation='portrait',scroll=0,playerImage=null,playerFrame=0,finish='night'}){
 const sourceImages=useLoader(T.TextureLoader,[staticFile('website-466.png'),staticFile('website-626.png'),staticFile('website-890.png')]);
 const {camera,advance}=useThree();
 const phone=useMemo(()=>createDuoModel(),[]);
 const canvasSet=useMemo(()=>{
  const all=[makeCanvas(1252,1780),makeCanvas(890,1252),makeCanvas(890,1252),makeCanvas(932,1356)];
  const maps=all.slice(1).map(canvas=>{const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return map;});
  phone.displays.forEach((display,i)=>{display.material.dispose();display.material=new T.MeshBasicMaterial({map:maps[i],toneMapped:false});});
  return {all,maps};
 },[phone]);
 const portrait=orientation==='portrait',w=portrait?626:890,h=portrait?890:626;
 const [page,left,right,cover]=canvasSet.all;
 page.width=w*2;page.height=h*2;
 const pageCtx=page.getContext('2d');pageCtx.scale(2,2);
 if(playerImage)paintPlayer(pageCtx,playerImage,playerFrame);
 else{
  const image=sourceImages[portrait?1:2].image;
  const sourceTop=Math.max(0,image.height-h*2)*scroll;
  pageCtx.drawImage(image,0,sourceTop,w*2,h*2,0,0,w,h);
 }
 for(const [i,canvas]of[left,right].entries()){
  canvas.width=portrait?h:w;canvas.height=portrait?w*2:h*2;
  const ctx=canvas.getContext('2d');
  if(portrait){ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(Math.PI/2);ctx.drawImage(page,0,i===0?h:0,w*2,h,-w,-h/2,w*2,h);}
  else ctx.drawImage(page,i*w,0,w,h*2,0,0,w,h*2);
  canvasSet.maps[i].needsUpdate=true;
 }
 const coverCtx=cover.getContext('2d');coverCtx.drawImage(sourceImages[0].image,0,0,932,1356,0,0,932,1356);canvasSet.maps[2].needsUpdate=true;
 phone.fold(fold);phone.finish(finish);
 useLayoutEffect(()=>{advance(performance.now());});
 camera.position.z=10.5/zoom;
 const beta=(180-fold)*Math.PI/180;
 useEffect(()=>()=>{phone.dispose();canvasSet.maps.forEach(map=>map.dispose());},[phone,canvasSet]);
 return <group rotation={[pitch,yaw,roll]}><group position={[MODEL.halfWidth*(1-Math.max(0,Math.cos(beta)))/2,0,-MODEL.halfWidth*Math.sin(beta)/2]}><primitive object={phone.root}/></group></group>;
}

function MovieDevice({videoRef,playerFrame,...props}){
 const env=useRemotionEnvironment();
 const texture=env.isRendering?useOffthreadVideoTexture({src:staticFile('trailer.mp4'),playbackRate:1}):useVideoTexture(videoRef);
 const poster=useLoader(T.TextureLoader,staticFile('poster.png'));
 return <Device {...props} playerImage={texture?.image||poster.image} playerFrame={playerFrame}/>;
}

export function Phone({scene,frame}){
 const videoRef=useRef(null),env=useRemotionEnvironment();
 const mediaFrame=frame<42?0:frame<105?frame-42:frame-42+50;
 let props={fold:180,roll:Math.PI/2,yaw:-.24,pitch:.1,zoom:1,orientation:'portrait',finish:'night'};
 if(scene===0)props={...props,fold:ease(frame,25,102,0,180),roll:ease(frame,25,102,0,Math.PI/2),yaw:ease(frame,0,120,-.48,-.18),pitch:ease(frame,0,120,.12,.06),zoom:ease(frame,0,110,.94,1.1)};
 if(scene===1){const rotating=ease(frame,102,148,0,1);props={...props,fold:ease(frame,22,78,0,180),roll:Math.PI/2*(1-rotating)*ease(frame,22,78,0,1),orientation:frame<125?'portrait':'landscape',yaw:ease(frame,0,180,-.24,.13),zoom:ease(frame,102,148,1.03,.92)};}
 if(scene===2)props={...props,fold:118,roll:0,yaw:ease(frame,0,180,-.28,.1),pitch:.14,orientation:'landscape',scroll:ease(frame,32,148,0,1),zoom:1.02};
 if(scene===3)props={...props,fold:ease(frame,0,42,140,100),pitch:ease(frame,0,42,-.45,-.8),yaw:ease(frame,0,180,-.28,-.13),zoom:1.08};
 if(scene===4)props={...props,fold:ease(frame,0,135,112,180),yaw:ease(frame,0,180,.3,-.16),pitch:.06,zoom:1.03,finish:'white'};
 return <>{scene===3&&!env.isRendering&&<Freeze frame={mediaFrame}><Html5Video ref={videoRef} src={staticFile('trailer.mp4')} muted style={{position:'absolute',width:1,height:1,opacity:0}}/></Freeze>}<ThreeCanvas width={1220} height={1000} dpr={1} camera={{fov:32,position:[0,0,10.5],near:.1,far:50}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} style={{position:'absolute',left:680,top:30,background:'transparent'}}>
  <StudioLight/>{scene===3?<Freeze frame={mediaFrame}><MovieDevice {...props} videoRef={videoRef} playerFrame={frame}/></Freeze>:<Device {...props}/>}
 </ThreeCanvas></>;
}

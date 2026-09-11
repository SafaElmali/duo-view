import * as T from './assets/three/three.module.min.js';
export const MODEL={halfWidth:2.46,height:3.52,depth:.13,hingeZ:.085,innerWidth:4.72,innerHeight:4.72*626/890,outerWidth:2.25,outerHeight:2.25*678/466};
function shape(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function panel(w,h,r,depth,mat){return new T.Mesh(new T.ExtrudeGeometry(shape(w,h,r),{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.009,bevelSegments:3,steps:1,curveSegments:16}),mat);}
function surface(w,h,r,mat){const g=new T.ShapeGeometry(shape(w,h,r),20);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);return new T.Mesh(g,mat);}
export function createDuoModel(){
 const root=new T.Group();root.name='iPhone_Duo';root.userData={description:'Independent illustrative iPhone Duo model',units:'1 unit = 33.47 mm approximately'};
 const {halfWidth:w,height:h,depth:d,hingeZ}=MODEL;
 const titanium=new T.MeshStandardMaterial({name:'Polished_Titanium',color:'#bfc1c4',metalness:.95,roughness:.22});
 const ceramic=new T.MeshStandardMaterial({name:'Star_White_Ceramic',color:'#e9e8e3',metalness:.15,roughness:.22});
 const black=new T.MeshStandardMaterial({name:'Black_Bezel',color:'#0b0d12',metalness:.35,roughness:.24});
 const screen=new T.MeshStandardMaterial({name:'Display',color:'#142153',emissive:'#253f87',emissiveIntensity:.6,roughness:.24,metalness:.15});
 const lens=new T.MeshPhysicalMaterial({name:'Sapphire_Lens',color:'#111d30',metalness:.7,roughness:.08,clearcoat:1});
 const accent=new T.MeshStandardMaterial({name:'Antenna_Insert',color:'#a0a4ac',metalness:.1,roughness:.6});
 const left=new T.Group();left.name='Left_Half';root.add(left);
 const right=new T.Group();right.name='Hinge_Right';right.position.z=hingeZ;root.add(right);
 const rightBody=new T.Group();rightBody.name='Right_Half';rightBody.position.z=-hingeZ;right.add(rightBody);
 const displays=[];
 for(const [group,sign] of [[left,-1],[rightBody,1]]){
  const body=panel(w-.025,h-.025,.205,d,titanium);body.name=sign<0?'Left_Titanium_Frame':'Right_Titanium_Frame';body.position.set(sign*w/2,0,-d/2);group.add(body);
  const bezel=surface(w-.055,h-.065,.185,black);bezel.position.set(sign*w/2,0,.077);bezel.name='Inner_Bezel';group.add(bezel);
  const half=surface(MODEL.innerWidth/2-.006,MODEL.innerHeight,.145,screen.clone());half.position.set(sign*MODEL.innerWidth/4,0,.079);half.name=sign<0?'Inner_Display_Left':'Inner_Display_Right';group.add(half);displays.push(half);
  const back=surface(w-.065,h-.07,.18,sign===1?black:ceramic);back.rotation.y=Math.PI;back.position.set(sign*w/2,0,-.077);back.name=sign<0?'Ceramic_Back':'Outer_Bezel';group.add(back);
  if(sign===1){const cover=surface(MODEL.outerWidth,MODEL.outerHeight,.15,screen.clone());cover.rotation.y=Math.PI;cover.position.set(w/2,0,-.079);cover.name='Outer_Display';group.add(cover);displays.push(cover);
   const punch=new T.Mesh(new T.CircleGeometry(.057,32),black);punch.rotation.y=Math.PI;punch.position.set(.28,h/2-.28,-.083);punch.name='Front_Camera';group.add(punch);
  }
  for(const y of [-1.25,1.25]){const antenna=new T.Mesh(new T.BoxGeometry(.013,.035,.14),accent);antenna.position.set(sign*(w+.003),y,0);antenna.name='Antenna_Band';group.add(antenna);}
  const button=panel(.055,.36,.025,.012,titanium);button.rotation.y=sign*Math.PI/2;button.position.set(sign*(w+.015),.65,-.03);button.name=sign===1?'Camera_Control':'Power_Touch_ID';group.add(button);
  if(sign<0){for(const y of [.08,-.35]){const volume=new T.Mesh(new T.BoxGeometry(.027,.28,.066),titanium);volume.position.set(-w-.01,y,0);volume.name='Volume_Button';group.add(volume);}}
  for(let i=0;i<5;i++){const hole=new T.Mesh(new T.SphereGeometry(.021,10,6),black);hole.scale.set(1,.35,1);hole.position.set(sign*w/2-.4+i*.115,-h/2-.001,0);hole.name='Speaker_Port';group.add(hole);}
 }
 const cameraPlate=panel(1.98,.67,.29,.073,ceramic);cameraPlate.rotation.y=Math.PI;cameraPlate.position.set(-w/2,h/2-.49,-.088);cameraPlate.name='Camera_Plate';left.add(cameraPlate);
 for(const x of [-w+.64,-w+1.31]){
  for(const [r,depth,z,mat,name] of [[.255,.03,-.193,titanium,'Camera_Ring'],[.228,.027,-.213,black,'Lens_Housing'],[.18,.013,-.232,lens,'Lens_Glass'],[.1,.005,-.242,lens,'Lens_Core']]){
   const m=new T.Mesh(new T.CylinderGeometry(r,r,depth,48),mat);m.rotation.x=Math.PI/2;m.position.set(x,h/2-.49,z);m.name=name;left.add(m);
  }
  const glint=new T.Mesh(new T.CircleGeometry(.027,20),new T.MeshBasicMaterial({name:'Lens_Reflection',color:'#466a9a'}));glint.rotation.y=Math.PI;glint.position.set(x+.034,h/2-.45,-.247);glint.name='Lens_Reflection';left.add(glint);
 }
 const flash=new T.Mesh(new T.CircleGeometry(.074,24),new T.MeshStandardMaterial({name:'Flash',color:'#faf1ce',roughness:.5}));flash.rotation.y=Math.PI;flash.position.set(-.46,h/2-.41,-.184);flash.name='Flash';left.add(flash);
 const microphone=new T.Mesh(new T.CircleGeometry(.022,16),black);microphone.rotation.y=Math.PI;microphone.position.set(-.46,h/2-.65,-.184);microphone.name='Microphone';left.add(microphone);
 const hinge=new T.Mesh(new T.CylinderGeometry(.058,.058,h-.17,32),titanium);hinge.position.z=-.01;hinge.name='Hinge_Spine';root.add(hinge);
 const usb=surface(.27,.065,.025,black);usb.rotation.x=Math.PI/2;usb.position.set(-w/2,-h/2-.009,.005);usb.name='USB_C_Port';left.add(usb);
 const innerAnchor=new T.Object3D();innerAnchor.name='Inner_Web_Surface';innerAnchor.position.set(0,0,.084);root.add(innerAnchor);
 const outerAnchor=new T.Object3D();outerAnchor.name='Outer_Web_Surface';outerAnchor.position.set(w/2,0,-.087);outerAnchor.rotation.y=Math.PI;rightBody.add(outerAnchor);
 const innerLeftAnchor=new T.Object3D();innerLeftAnchor.position.set(-MODEL.innerWidth/4,0,.086);left.add(innerLeftAnchor);
 const innerRightAnchor=new T.Object3D();innerRightAnchor.position.set(MODEL.innerWidth/4,0,.086);rightBody.add(innerRightAnchor);
 function fold(angle){if(!Number.isFinite(angle)||angle<0||angle>180)throw new Error('Fold angle must be between 0 and 180.');right.rotation.y=-(180-angle)*Math.PI/180;}
 function finish(value){if(!['white','night'].includes(value))throw new Error('Unknown finish.');titanium.color.set(value==='white'?'#bfc1c4':'#465367');ceramic.color.set(value==='white'?'#e9e8e3':'#27354b');}
 function dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 return {root,left,right,rightBody,displays,innerAnchor,outerAnchor,innerLeftAnchor,innerRightAnchor,fold,finish,dispose};
}
export function modelRoll(display,orientation){if(!['folded','open'].includes(display)||!['portrait','landscape'].includes(orientation))throw new Error('Invalid model orientation.');return display==='open'?(orientation==='portrait'?Math.PI/2:0):(orientation==='landscape'?-Math.PI/2:0);}

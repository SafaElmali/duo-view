import * as T from './assets/three/three.module.min.js';
export const MODEL={halfWidth:2.46,height:3.52,depth:.13,hingeZ:.085,innerWidth:4.72,innerHeight:4.72*626/890,outerWidth:2.25,outerHeight:2.25*678/466};
function shape(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function panel(w,h,r,depth,mat){return new T.Mesh(new T.ExtrudeGeometry(shape(w,h,r),{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.009,bevelSegments:3,steps:1,curveSegments:16}),mat);}
function surface(w,h,r,mat){const g=new T.ShapeGeometry(shape(w,h,r),20);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);return new T.Mesh(g,mat);}
function rearHardware(w,h,ceramic,titanium,black){
 // Work in rear-facing coordinates so the lens order stays correct from behind.
 const rear=new T.Group();rear.name='Rear_Hardware';rear.rotation.y=Math.PI;rear.position.set(-w/2,0,-.079);
 const lensHousing=new T.MeshStandardMaterial({name:'Camera_Graphite',color:'#17181b',metalness:.35,roughness:.32});
 const glass=new T.MeshPhysicalMaterial({name:'Sapphire_Lens',color:'#080b12',metalness:.35,roughness:.12,clearcoat:1,clearcoatRoughness:.06});
 const optics=new T.MeshStandardMaterial({name:'Lens_Optics',color:'#17263d',metalness:.5,roughness:.2});
 const flashGlass=new T.MeshPhysicalMaterial({name:'Flash_Diffuser',color:'#f6f2e5',metalness:.05,roughness:.42,clearcoat:.4});
 const logoMaterial=new T.MeshStandardMaterial({name:'Rear_Logo_Inlay',color:'#d8d7d2',metalness:.3,roughness:.42});
 const cameraY=h/2-.44;
 const island=new T.Mesh(new T.ExtrudeGeometry(shape(1.64,.61,.305),{depth:.054,bevelEnabled:true,bevelSize:.035,bevelThickness:.021,bevelSegments:5,curveSegments:24,steps:1}),ceramic);
 island.name='Camera_Plate';island.position.set(-.28,cameraY,.022);rear.add(island);
 function disc(radius,depth,x,y,z,material,name){const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,depth,64),material);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);mesh.name=name;rear.add(mesh);return mesh;}
 function ring(radius,tube,x,y,z,material,name,arc=Math.PI*2){const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,10,64,arc),material);mesh.position.set(x,y,z);mesh.name=name;rear.add(mesh);return mesh;}
 for(const x of [-.8,-.27]){
  disc(.244,.037,x,cameraY,.11,titanium,'Camera_Ring');
  ring(.234,.012,x,cameraY,.133,titanium,'Polished_Lens_Rim');
  disc(.218,.043,x,cameraY,.126,lensHousing,'Lens_Housing');
  disc(.188,.005,x,cameraY,.15,glass,'Lens_Glass');
  ring(.171,.003,x,cameraY,.154,lensHousing,'Lens_Inner_Rim');
  disc(.076,.003,x,cameraY,.155,optics,'Lens_Optics');
  disc(.055,.002,x,cameraY,.158,black,'Lens_Core');
  const reflection=ring(.052,.007,x,cameraY,.16,optics,'Lens_Reflection',Math.PI*.6);reflection.rotation.z=.5;
  const glint=new T.Mesh(new T.CircleGeometry(.013,20),new T.MeshStandardMaterial({name:'Lens_Glint',color:'#514573',metalness:.45,roughness:.2}));glint.position.set(x-.024,cameraY+.026,.162);glint.name='Lens_Glint';rear.add(glint);
 }
 const sensor=surface(.096,.041,.02,new T.MeshStandardMaterial({name:'Microphone_Insert',color:'#777a72',roughness:.7}));sensor.position.set(.23,cameraY+.13,.099);sensor.name='Microphone';rear.add(sensor);
 disc(.06,.006,.23,cameraY-.13,.1,titanium,'Flash_Rim');
 disc(.05,.007,.23,cameraY-.13,.106,flashGlass,'Flash');
 disc(.022,.002,.23,cameraY-.13,.111,new T.MeshStandardMaterial({name:'Flash_Warm_Emitter',color:'#e8d1ae',roughness:.65}),'Flash_Emitter');
 const mark=new T.Shape();mark.moveTo(.04,.54);mark.bezierCurveTo(-.18,.52,-.29,.7,-.55,.67);mark.bezierCurveTo(-.91,.65,-1.08,.33,-1.05,-.08);mark.bezierCurveTo(-1.02,-.48,-.7,-1,-.46,-1);mark.bezierCurveTo(-.26,-1,-.18,-.89,.03,-.89);mark.bezierCurveTo(.24,-.89,.28,-1,.48,-.98);mark.bezierCurveTo(.69,-.96,.9,-.65,1,-.38);mark.bezierCurveTo(.62,-.21,.52,.26,.95,.52);mark.bezierCurveTo(.74,.79,.45,.77,.22,.66);mark.bezierCurveTo(.14,.61,.1,.56,.04,.54);mark.closePath();
 const leaf=new T.Shape();leaf.moveTo(.01,.78);leaf.bezierCurveTo(.02,1.1,.24,1.3,.57,1.35);leaf.bezierCurveTo(.6,1.08,.38,.8,.01,.78);leaf.closePath();
 const logo=new T.Mesh(new T.ShapeGeometry([mark,leaf],28),logoMaterial);logo.name='Rear_Logo';logo.scale.setScalar(.245);logo.position.set(0,-.043,.001);rear.add(logo);
 return {rear,logoMaterial};
}
export function createDuoModel(){
 const root=new T.Group();root.name='iPhone_Duo';root.userData={description:'Independent illustrative iPhone Duo model',units:'1 unit = 33.47 mm approximately'};
 const {halfWidth:w,height:h,depth:d,hingeZ}=MODEL;
 const titanium=new T.MeshStandardMaterial({name:'Polished_Titanium',color:'#bfc1c4',metalness:.95,roughness:.22});
 const ceramic=new T.MeshPhysicalMaterial({name:'Star_White_Ceramic',color:'#f0eee8',metalness:.08,roughness:.3,clearcoat:.45,clearcoatRoughness:.24});
 const black=new T.MeshStandardMaterial({name:'Black_Bezel',color:'#0b0d12',metalness:.35,roughness:.24});
 const screen=new T.MeshStandardMaterial({name:'Display',color:'#142153',emissive:'#253f87',emissiveIntensity:.6,roughness:.24,metalness:.15});
 const accent=new T.MeshStandardMaterial({name:'Antenna_Insert',color:'#a0a4ac',metalness:.1,roughness:.6});
 const left=new T.Group();left.name='Left_Half';root.add(left);
 const right=new T.Group();right.name='Hinge_Right';right.position.z=hingeZ;root.add(right);
 const rightBody=new T.Group();rightBody.name='Right_Half';rightBody.position.z=-hingeZ;right.add(rightBody);
 const displays=[];
 for(const [group,sign] of [[left,-1],[rightBody,1]]){
  const body=panel(w-.025,h-.025,.3,d,titanium);body.name=sign<0?'Left_Titanium_Frame':'Right_Titanium_Frame';body.position.set(sign*w/2,0,-d/2);group.add(body);
  const bezel=surface(w-.055,h-.065,.275,black);bezel.position.set(sign*w/2,0,.077);bezel.name='Inner_Bezel';group.add(bezel);
  const half=surface(MODEL.innerWidth/2-.006,MODEL.innerHeight,.145,screen.clone());half.position.set(sign*MODEL.innerWidth/4,0,.079);half.name=sign<0?'Inner_Display_Left':'Inner_Display_Right';group.add(half);displays.push(half);
  const back=surface(w-.065,h-.07,.275,sign===1?black:ceramic);back.rotation.y=Math.PI;back.position.set(sign*w/2,0,-.077);back.name=sign<0?'Ceramic_Back':'Outer_Bezel';group.add(back);
  if(sign===1){const cover=surface(MODEL.outerWidth,MODEL.outerHeight,.15,screen.clone());cover.rotation.y=Math.PI;cover.position.set(w/2,0,-.079);cover.name='Outer_Display';group.add(cover);displays.push(cover);
   const punch=new T.Mesh(new T.CircleGeometry(.057,32),black);punch.rotation.y=Math.PI;punch.position.set(.28,h/2-.28,-.083);punch.name='Front_Camera';group.add(punch);
  }
  for(const y of [-1.25,1.25]){const antenna=new T.Mesh(new T.BoxGeometry(.013,.035,.14),accent);antenna.position.set(sign*(w+.003),y,0);antenna.name='Antenna_Band';group.add(antenna);}
  const button=panel(.055,.36,.025,.012,titanium);button.rotation.y=sign*Math.PI/2;button.position.set(sign*(w+.015),.65,-.03);button.name=sign===1?'Camera_Control':'Power_Touch_ID';group.add(button);
  if(sign<0){for(const y of [.08,-.35]){const volume=new T.Mesh(new T.BoxGeometry(.027,.28,.066),titanium);volume.position.set(-w-.01,y,0);volume.name='Volume_Button';group.add(volume);}}
  for(let i=0;i<5;i++){const hole=new T.Mesh(new T.SphereGeometry(.021,10,6),black);hole.scale.set(1,.35,1);hole.position.set(sign*w/2-.4+i*.115,-h/2-.001,0);hole.name='Speaker_Port';group.add(hole);}
 }
 const {rear,logoMaterial}=rearHardware(w,h,ceramic,titanium,black);left.add(rear);
 const hinge=new T.Mesh(new T.CylinderGeometry(.058,.058,h-.17,32),titanium);hinge.position.z=-.01;hinge.name='Hinge_Spine';root.add(hinge);
 const usb=surface(.27,.065,.025,black);usb.rotation.x=Math.PI/2;usb.position.set(-w/2,-h/2-.009,.005);usb.name='USB_C_Port';left.add(usb);
 const innerAnchor=new T.Object3D();innerAnchor.name='Inner_Web_Surface';innerAnchor.position.set(0,0,.084);root.add(innerAnchor);
 const outerAnchor=new T.Object3D();outerAnchor.name='Outer_Web_Surface';outerAnchor.position.set(w/2,0,-.087);outerAnchor.rotation.y=Math.PI;rightBody.add(outerAnchor);
 const innerLeftAnchor=new T.Object3D();innerLeftAnchor.position.set(-MODEL.innerWidth/4,0,.086);left.add(innerLeftAnchor);
 const innerRightAnchor=new T.Object3D();innerRightAnchor.position.set(MODEL.innerWidth/4,0,.086);rightBody.add(innerRightAnchor);
 function fold(angle){if(!Number.isFinite(angle)||angle<0||angle>180)throw new Error('Fold angle must be between 0 and 180.');right.rotation.y=-(180-angle)*Math.PI/180;}
 function finish(value){if(!['white','night'].includes(value))throw new Error('Unknown finish.');titanium.color.set(value==='white'?'#bfc1c4':'#465367');ceramic.color.set(value==='white'?'#f0eee8':'#27354b');logoMaterial.color.set(value==='white'?'#d8d7d2':'#536078');}
 function dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 return {root,left,right,rightBody,displays,innerAnchor,outerAnchor,innerLeftAnchor,innerRightAnchor,fold,finish,dispose};
}
export function modelRoll(display,orientation){if(!['folded','open'].includes(display)||!['portrait','landscape'].includes(orientation))throw new Error('Invalid model orientation.');return display==='open'?(orientation==='portrait'?Math.PI/2:0):(orientation==='landscape'?-Math.PI/2:0);}

import {studioUrl} from './routes.mjs';
import {normalizeUrl,validDimension} from './simulator.mjs';
import {validateSnapshotUrl} from './snapshot.mjs';
import {matchExampleUrl,resolveExampleUrl} from './example-gallery.mjs';
import {validateAnnotation} from './preview-annotations.mjs';

export const DEFAULT_PREVIEW=Object.freeze({display:'open',orientation:'portrait',view:'three',chrome:false,hinge:false,zoom:'fit',custom:null,mode:'embedded',foldAngle:100,finish:'night',pose:'tabletop',content:'player',comparison:'poses',reference:'standard',annotation:null});
const choices={display:['open','folded'],orientation:['portrait','landscape'],view:['three','single','compare'],zoom:['fit','0.5','0.75','1'],mode:['embedded','snapshot'],finish:['night','white'],pose:['tabletop','book','flat'],content:['player','website'],comparison:['poses','phone'],reference:['compact','standard','large']};
const MAX_LINK_LENGTH=16000;
const invalid=()=>new Error('This preview link is incomplete or invalid. Ask the sender for a new link.');

export function shareBase(href){
 const base=new URL(href);
 if(base.protocol==='file:'||base.hostname==='localhost'||base.hostname.endsWith('.localhost')||base.hostname==='127.0.0.1'||base.hostname==='[::1]')return 'https://duo-view.netlify.app/studio/';
 return studioUrl(base.href);
}

function publicWebsite(raw,base,mode){
 const url=new URL(normalizeUrl(raw,base,{embedded:mode==='embedded'}));
 // Keep ordinary hash routes, but don't turn local pages or access URLs into public shares.
 const publicUrl=new URL(url);publicUrl.hash='';
 try{validateSnapshotUrl(publicUrl.href);}catch{throw new Error('Share a public website URL without private access parameters. Local pages can only be previewed on your computer.');}
 if(/(?:^|[?&#])(?:[^=&#]*(?:token|secret|password|authorization|api.?key|session|signature)[^=&#]*)=/i.test(url.hash))throw new Error('Remove private access parameters before sharing this website.');
 if(mode==='snapshot')validateSnapshotUrl(url.href);
 return url.href;
}

export function readPreviewLink(hash,{base,demoUrl}){
 const params=new URLSearchParams(hash.replace(/^#/,''));
 if(!params.has('duo'))return null;
 if(hash.length>MAX_LINK_LENGTH||params.get('duo')!=='1')throw invalid();
 for(const key of new Set(params.keys()))if(params.getAll(key).length!==1)throw invalid();
 const state={...DEFAULT_PREVIEW,url:demoUrl};
 for(const [key,values]of Object.entries(choices))if(params.has(key)){
  if(!values.includes(params.get(key)))throw invalid();
  state[key]=params.get(key);
 }
 for(const key of ['chrome','hinge'])if(params.has(key)){
  if(!['0','1'].includes(params.get(key)))throw invalid();state[key]=params.get(key)==='1';
 }
 if(params.has('angle')){
  const value=params.get('angle');if(!value.trim()||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>180)throw invalid();
  state.foldAngle=Number(value);
 }else if(state.display==='folded')state.foldAngle=0;
 if(state.display!==(state.foldAngle<4?'folded':'open'))throw invalid();
 if(params.has('width')||params.has('height')){
  const width=Number(params.get('width')),height=Number(params.get('height'));
  if(!validDimension(width)||!validDimension(height))throw invalid();state.custom={width,height};
 }
 if(params.has('url')){
  if(params.has('example'))throw invalid();
  state.url=publicWebsite(params.get('url'),base,state.mode);
  if(!params.has('content'))state.content='website';
 }
 if(params.has('example')){
  const url=resolveExampleUrl(params.get('example'),base);if(!url)throw invalid();
  state.url=url;state.content='website';state.mode='embedded';
 }
 if(state.view!=='three')state.content='website';
 if(params.has('note')||params.has('region')){
  const annotation={note:params.get('note')??''};
  if(params.has('region')){
   const values=params.get('region').split(',');
   if(values.length!==4||values.some(value=>!value.trim()||!Number.isFinite(Number(value))))throw invalid();
   const [x,y,width,height]=values.map(Number);annotation.rect={x,y,width,height};
  }
  try{state.annotation=validateAnnotation(annotation);}catch{throw invalid();}
  if(!state.annotation||state.view!=='single'||state.content!=='website')throw invalid();
 }
 let camera=null;
 if(params.has('camera')){
  const values=params.get('camera').split(',');
  if(values.length!==3||values.some(value=>!value.trim()||!Number.isFinite(Number(value))))throw invalid();
  const [yaw,pitch,zoom]=values.map(Number);
  if(Math.abs(yaw)>Math.PI+.00001||Math.abs(pitch)>Math.PI+.00001||zoom<.7||zoom>1.4)throw invalid();
  camera={yaw,pitch,zoom};
 }
 return {state,camera};
}

export function createPreviewLink(state,{href,demoUrl,camera=null}){
 const base=shareBase(href),params=new URLSearchParams({duo:'1'});
 const example=state.content==='website'&&matchExampleUrl(state.url,href);
 if(example)params.set('example',example.id);
 else if(state.content==='website'&&state.url!==demoUrl)params.set('url',publicWebsite(state.url,base,state.mode));
 for(const key of Object.keys(choices))if(state[key]!==undefined&&state[key]!==DEFAULT_PREVIEW[key])params.set(key,state[key]);
 for(const key of ['chrome','hinge'])if(state[key])params.set(key,'1');
 if(state.foldAngle!==DEFAULT_PREVIEW.foldAngle)params.set('angle',String(state.foldAngle));
 if(state.custom){params.set('width',state.custom.width);params.set('height',state.custom.height);}
 if(state.annotation){
  const annotation=validateAnnotation(state.annotation);
  if(annotation){
   if(annotation.note)params.set('note',annotation.note);
   if(annotation.rect)params.set('region',['x','y','width','height'].map(key=>annotation.rect[key]).join(','));
  }
 }
 if(state.view==='three'&&camera){
  const angle=value=>Number(Math.atan2(Math.sin(value),Math.cos(value)).toFixed(5));
  params.set('camera',[angle(camera.yaw),angle(camera.pitch),Number(camera.zoom.toFixed(5))].join(','));
 }
 const hash='#'+params.toString();
 readPreviewLink(hash,{base,demoUrl});
 return base+hash;
}

export function bindPreviewSharing({getPreview,onEvent=()=>{}}){
 const dialog=document.querySelector('#share-dialog'),link=document.querySelector('#share-link');
 const status=document.querySelector('#share-feedback'),copy=document.querySelector('#copy-share-link');
 document.querySelector('#share-preview').addEventListener('click',()=>{
  status.textContent='';copy.textContent='Copy link';
  try{
   const preview=getPreview();link.value=preview.url;
   document.querySelector('#share-summary').textContent=preview.summary;
   document.querySelector('#share-link-field').hidden=false;copy.disabled=false;
  }catch(error){link.value='';document.querySelector('#share-link-field').hidden=true;copy.disabled=true;status.textContent=error.message;document.querySelector('#share-summary').textContent='Choose a public website to share its preview.';}
  dialog.showModal();onEvent('duo_share_opened');
 });
 document.querySelector('#close-share').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
 link.addEventListener('click',()=>link.select());
 copy.addEventListener('click',async()=>{
  const value=link.value;copy.disabled=true;
  try{
   await navigator.clipboard.writeText(value);
   if(dialog.open&&link.value===value){copy.textContent='Copied';status.textContent='Link copied. Ready to share.';}
   onEvent('duo_share_copied',{success:true});
  }catch{
   if(dialog.open&&link.value===value){link.focus();link.select();status.textContent='Copy the selected link using your browser’s Copy command.';}
   onEvent('duo_share_copied',{success:false});
  }finally{copy.disabled=!link.value;}
 });
}

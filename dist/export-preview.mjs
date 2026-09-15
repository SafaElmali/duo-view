import {dimensions} from './simulator.mjs';
import {captureSnapshot,validateSnapshotUrl} from './snapshot.mjs';

const POSES=['open','folded','tabletop'];
const abortError=()=>new DOMException('Image creation cancelled.','AbortError');
const checkAbort=signal=>{if(signal?.aborted)throw abortError();};

export function exportConfiguration(state,pose){
 if(!POSES.includes(pose))throw new Error('Choose a valid image pose.');
 const preview={...state,display:pose==='folded'?'folded':'open',pose:pose==='tabletop'?'tabletop':'flat',foldAngle:pose==='folded'?0:pose==='tabletop'?100:180};
 return {state:preview,size:dimensions(preview.display,preview.orientation,preview.chrome,preview.custom),pose};
}
export function reusableExportCapture(capture,size){
 return Boolean(capture&&!capture.pending&&!capture.error&&(capture.image||capture.canvas)&&capture.width===size.width&&Number.isSafeInteger(capture.height)&&capture.height>=size.contentHeight);
}
export function exportCrop(width,height,size){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width!==size.width||height<size.contentHeight)throw new Error('The captured image does not match this viewport. Create another image.');
 return {x:0,y:0,width,height:size.contentHeight};
}
export function exportFilename(state,pose){
 const source=state.content==='player'?'streaming-demo':new URL(state.url).hostname;
 return `duo-view-${source.replace(/[^a-z0-9.-]+/gi,'-').slice(0,70)}-${pose}-${state.orientation}.png`;
}
function pause(ms,signal){
 return new Promise((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);reject(abortError());};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 });
}

// getExistingCapture must look up the exact state.url + size.width + size.contentHeight.
// getLocalCapture returns an actual same-origin page/player capture, or null for public sites.
export async function acquireExportCapture({state,size,signal,getExistingCapture=()=>null,getLocalCapture=()=>null,capture=captureSnapshot}){
 checkAbort(signal);
 const existing=state.content==='player'?null:getExistingCapture({state,size});
 if(existing?.pending){
  const deadline=Date.now()+55000;
  while(existing.pending&&Date.now()<deadline){await pause(200,signal);}
  checkAbort(signal);
  if(existing.pending)throw new Error('The current snapshot is still loading. Try again when the preview is ready.');
 }
 if(reusableExportCapture(existing,size))return existing;
 const local=await getLocalCapture({state,size,signal});
 checkAbort(signal);
 if(local){if(!reusableExportCapture(local,size))throw new Error('The local preview could not be captured at this viewport.');return local;}
 if(state.content==='player')throw new Error('The streaming demo is not ready to export. Open the demo, then try again.');
 validateSnapshotUrl(state.url);
 return capture(state.url,size,signal);
}

function decodeExportImage(src,signal){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';
  const finish=(error)=>{signal?.removeEventListener('abort',abort);img.onload=null;img.onerror=null;error?reject(error):resolve(img);};
  const abort=()=>{finish(abortError());img.src='';};
  img.onload=()=>finish();
  img.onerror=()=>finish(new Error('This image cannot be exported by your browser. The source may block image access (CORS). Try another website or an example.'));
  if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
  try{img.src=src;}catch(error){finish(error);}
 });
}
export async function loadExportImage(src,signal){
 checkAbort(signal);
 let objectUrl=null;
 try{
  if(/^https?:\/\//i.test(src)){
   // Display previews load without CORS. Revalidate the image using a CORS fetch
   // so an earlier opaque display-cache entry cannot taint the exported canvas.
   try{
    const response=await fetch(src,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'reload',signal});
    if(!response.ok||response.type==='opaque')throw new Error('Image request failed.');
    const blob=await response.blob();checkAbort(signal);
    if(!blob.type.startsWith('image/'))throw new Error('The capture was not an image.');
    objectUrl=URL.createObjectURL(blob);
   }catch(error){
    if(signal?.aborted||error.name==='AbortError')throw abortError();
    throw new Error('This screenshot could not be loaded for export. The image service may be unavailable or block image access (CORS). Try again or choose an example.');
   }
  }
  // Local data SVGs retain the original direct-decode path.
  return await decodeExportImage(objectUrl||src,signal);
 }finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
}
// Computed SVG paint URLs may be expanded to the full document URL. Keep them
// as fragment references so the cloned gradient/filter is resolved inside the SVG.
export function localPaintReference(src,base){
 if(src.startsWith('#'))return src;
 try{
  const reference=new URL(src,base),documentUrl=new URL(base),fragment=reference.hash;
  reference.hash='';documentUrl.hash='';
  return fragment&&reference.href===documentUrl.href?fragment:null;
 }catch{return null;}
}
async function dataUrl(src,doc,signal){
 if(/^data:image\//i.test(src))return src;
 const url=new URL(src,doc.baseURI);
 if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol))throw new Error('This preview includes an external image that cannot be captured locally.');
 const response=await fetch(url.href,{signal,credentials:'same-origin'});
 if(!response.ok)throw new Error('An image in the preview could not load. Try again.');
 const blob=await response.blob();
 if(!blob.type.startsWith('image/'))throw new Error('A preview asset was not an image.');
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('A preview image could not be read.'));reader.readAsDataURL(blob);});
}
function makeCanvas(width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 if(!canvas.getContext('2d'))throw new Error('Image export needs canvas support in this browser.');
 return canvas;
}
async function clonePaintedElement(source,signal,assets=new Map()){
 checkAbort(signal);
 const doc=source.ownerDocument,view=doc.defaultView;
 const inlineAsset=src=>{if(!assets.has(src))assets.set(src,dataUrl(src,doc,signal));return assets.get(src);};
 const style=view.getComputedStyle(source);
 if(['SCRIPT','STYLE','LINK','IFRAME','OBJECT','EMBED'].includes(source.tagName))return null;
 let clone;
 if(source.tagName==='CANVAS'||source.tagName==='VIDEO'){
  clone=doc.createElement('img');
  try{
   if(source.tagName==='CANVAS')clone.src=source.toDataURL('image/png');
   else if(source.readyState>=2){const frame=makeCanvas(source.videoWidth,source.videoHeight);frame.getContext('2d').drawImage(source,0,0);clone.src=frame.toDataURL('image/png');}
   else if(source.poster)clone.src=await inlineAsset(source.poster);
   else throw new Error('Video is still loading.');
  }catch{throw new Error('The video frame is not available for export. Wait for it to load and try again.');}
 }else clone=source.cloneNode(false);
 for(const attribute of [...clone.attributes])if(/^on/i.test(attribute.name)||['srcset','sizes','autofocus'].includes(attribute.name))clone.removeAttribute(attribute.name);
 clone.style.cssText='';
 for(const property of style){
  let value=style.getPropertyValue(property);
  // Every external resource must be embedded before SVG rasterization.
  if(value.includes('url(')){
   const matches=[...value.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
   for(const match of matches){const fragment=localPaintReference(match[1],doc.baseURI);value=value.replace(match[0],`url("${fragment||await inlineAsset(match[1])}")`);}
  }
  clone.style.setProperty(property,value);
 }
 clone.style.animation='none';clone.style.transition='none';clone.style.caretColor='transparent';
 if(clone.tagName==='IMG'&&source.tagName==='IMG'){
  if(!source.complete||!source.naturalWidth)throw new Error('An image in the preview is still loading. Try again.');
  clone.src=await inlineAsset(source.currentSrc||source.src);
 }
 if(source.tagName==='INPUT'){clone.setAttribute('value',source.value);if(source.checked)clone.setAttribute('checked','');}
 if(source.tagName==='TEXTAREA')clone.textContent=source.value;
 if(!['CANVAS','VIDEO','TEXTAREA'].includes(source.tagName))for(const child of source.childNodes){
  if(child.nodeType===3)clone.append(child.cloneNode());
  else if(child.nodeType===1){const painted=await clonePaintedElement(child,signal,assets);if(painted)clone.append(painted);}
 }
 return clone;
}

// Captures real DOM only. The caller must supply a trusted, same-origin element.
// External frames are deliberately excluded; browser-protected assets produce errors.
export async function captureLocalElement(element,{width=element?.offsetWidth,height=element?.offsetHeight,signal}={}){
 if(!element||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>3200||height>4000)throw new Error('The local preview is not ready to capture.');
 const clone=await clonePaintedElement(element,signal);
 if(!clone)throw new Error('This preview cannot be captured locally.');
 Object.assign(clone.style,{margin:'0',position:'relative',left:'0',top:'0',transform:'none',visibility:'visible',opacity:'1',width:`${width}px`,height:`${height}px`,minHeight:'0',overflow:'hidden'});
 clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 const xml=new XMLSerializer().serializeToString(clone);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
 const rendered=await loadExportImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),signal);
 checkAbort(signal);
 const canvas=makeCanvas(width,height),ctx=canvas.getContext('2d');
 try{
  ctx.drawImage(rendered,0,0);
  const pixels=ctx.getImageData(0,0,width,height).data;
  // Safari and unsupported SVG implementations can silently paint nothing.
  let visible=0;for(let index=3;index<pixels.length;index+=4)if(pixels[index]>0){visible++;if(visible>width)break;}
  if(visible<=width)throw new Error('empty');
 }catch{throw new Error('Your browser could not capture this local preview. Try image export in Chrome or Edge.');}
 return {canvas,width,height};
}

export async function captureLocalPage(url,{size,signal}){
 const source=new URL(url,location.href);
 if(source.origin!==location.origin||!['http:','https:'].includes(source.protocol))throw new Error('Local image capture needs a same-origin example opened over HTTP.');
 checkAbort(signal);
 const frame=document.createElement('iframe');frame.title='Preparing example image';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
 Object.assign(frame.style,{position:'fixed',left:'-10000px',top:'0',border:'0',width:`${size.width}px`,height:`${size.contentHeight}px`,pointerEvents:'none'});
 try{
  await new Promise((resolve,reject)=>{
   const done=error=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);frame.onload=null;frame.onerror=null;error?reject(error):resolve();};
   const abort=()=>done(abortError());
   const timer=setTimeout(()=>done(new Error('The example did not load in time. Try again.')),15000);
   frame.onload=()=>done();frame.onerror=()=>done(new Error('The example could not load.'));
   signal?.addEventListener('abort',abort,{once:true});frame.src=source.href;document.body.append(frame);
  });
  checkAbort(signal);
  const doc=frame.contentDocument;
  if(!doc?.body||doc.location.href!==source.href)throw new Error('The example navigated away before it could be captured.');
  await doc.fonts?.ready;
  await pause(80,signal);
  const result=await captureLocalElement(doc.body,{width:size.width,height:size.contentHeight,signal});
  return {...result,label:doc.title||'Example website',kind:'local'};
 }finally{frame.remove();}
}

export async function capturePlayerPreview({root=document,size,orientation='portrait',signal}){
 const top=root.querySelector('.duo-player-picture'),bottom=root.querySelector('.duo-player-controls');
 if(!top||!bottom)throw new Error('Open the streaming demo before creating an image.');
 const picture=await captureLocalElement(top,{signal}),controls=await captureLocalElement(bottom,{signal});
 const canvas=makeCanvas(size.width,size.contentHeight),ctx=canvas.getContext('2d');
 ctx.fillStyle='#131316';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(orientation==='portrait'){
  ctx.drawImage(picture.canvas,0,0,canvas.width,canvas.height/2);
  ctx.drawImage(controls.canvas,0,canvas.height/2,canvas.width,canvas.height/2);
 }else{
  ctx.drawImage(picture.canvas,0,0,canvas.width/2,canvas.height);
  ctx.drawImage(controls.canvas,canvas.width/2,0,canvas.width/2,canvas.height);
 }
 return {canvas,width:size.width,height:size.contentHeight,kind:'local',label:'Sintel streaming demo',attribution:'Sintel © Blender Foundation · CC BY 3.0 · durian.blender.org'};
}

function rounded(ctx,x,y,width,height,radius){
 ctx.beginPath();ctx.roundRect(x,y,width,height,radius);
}
function screen(ctx,image,crop,x,y,width,height,radius=22){
 ctx.save();rounded(ctx,x,y,width,height,radius);ctx.clip();ctx.drawImage(image,crop.x,crop.y,crop.width,crop.height,x,y,width,height);ctx.restore();
}
function drawTabletop(ctx,image,crop,x,y,width,height,finish){
 // Two affine faces share exactly one source viewport at the hinge.
 const topHeight=height*.59,lowerHeight=height*.3,skew=width*.14;
 ctx.save();ctx.shadowColor='#14203530';ctx.shadowBlur=45;ctx.shadowOffsetY=25;
 ctx.fillStyle=finish;rounded(ctx,x,y,width,topHeight+12,26);ctx.fill();ctx.restore();
 screen(ctx,image,{...crop,height:crop.height/2},x+12,y+12,width-24,topHeight-14,18);
 ctx.save();ctx.translate(x,y+topHeight);ctx.transform(1,0,skew/lowerHeight,1,0,0);
 ctx.fillStyle=finish;rounded(ctx,0,0,width,lowerHeight, [0,0,24,24]);ctx.fill();
 screen(ctx,image,{...crop,y:crop.height/2,height:crop.height/2},12,5,width-24,lowerHeight-17,[0,0,15,15]);
 ctx.restore();ctx.fillStyle='#080c12';ctx.fillRect(x+5,y+topHeight-3,width-10,8);
 const gloss=ctx.createLinearGradient(x,y+topHeight,x,y+topHeight+lowerHeight);gloss.addColorStop(0,'#06102622');gloss.addColorStop(1,'#ffffff09');
 ctx.save();ctx.translate(x,y+topHeight);ctx.transform(1,0,skew/lowerHeight,1,0,0);ctx.fillStyle=gloss;rounded(ctx,12,5,width-24,lowerHeight-17,[0,0,15,15]);ctx.fill();ctx.restore();
}
export async function renderExportCard(capture,{state,size,pose,credit=true,signal}){
 checkAbort(signal);
 const image=capture.canvas||await loadExportImage(capture.image,signal);
 const crop=exportCrop(image.naturalWidth??image.width,image.naturalHeight??image.height,size);
 const canvas=makeCanvas(1600,1200),ctx=canvas.getContext('2d');
 ctx.fillStyle='#f7f8fb';ctx.fillRect(0,0,1600,1200);
 const wash=ctx.createRadialGradient(810,570,30,800,580,760);wash.addColorStop(0,'#e4eaff');wash.addColorStop(1,'#f7f8fb');ctx.fillStyle=wash;ctx.fillRect(0,170,1600,910);
 const name=capture.label||(state.content==='player'?'Streaming demo':new URL(state.url).hostname);
 ctx.fillStyle='#172137';ctx.font='600 42px system-ui, sans-serif';
 let title=name;while(ctx.measureText(title).width>1400&&title.length>10)title=title.slice(0,-2);if(title!==name)title+='…';ctx.fillText(title,80,94);
 ctx.font='23px system-ui, sans-serif';ctx.fillStyle='#62708a';
 ctx.fillText(`${size.width} × ${size.contentHeight} CSS px  ·  ${state.orientation==='portrait'?'Portrait':'Landscape'}  ·  ${pose==='tabletop'?'Tabletop frame':pose==='folded'?'Folded frame':'Open frame'}`,80,141);
 const aspect=size.width/size.contentHeight;
 let width=Math.min(1120,720*aspect),height=width/aspect;
 if(pose==='tabletop'){width=Math.min(920,770*aspect);height=width/aspect;}
 const actualWidth=pose==='tabletop'?width*1.14:width;
 const actualHeight=pose==='tabletop'?height*.89:height;
 const x=(1600-actualWidth)/2,y=225+(790-actualHeight)/2;
 const finish=state.finish==='white'?'#d3d6dd':'#20242d';
 if(pose==='tabletop')drawTabletop(ctx,image,crop,x,y,width,height,finish);
 else{
  ctx.save();ctx.fillStyle=finish;ctx.shadowColor='#15244b3b';ctx.shadowBlur=65;ctx.shadowOffsetY=24;rounded(ctx,x-13,y-13,width+26,height+26,38);ctx.fill();ctx.restore();
  screen(ctx,image,crop,x,y,width,height,27);
  if(pose==='open'&&state.hinge){ctx.fillStyle='#00000018';if(state.orientation==='portrait')ctx.fillRect(x,y+height/2-2,width,4);else ctx.fillRect(x+width/2-2,y,4,height);}
 }
 ctx.strokeStyle='#dbe1ec';ctx.beginPath();ctx.moveTo(80,1085);ctx.lineTo(1520,1085);ctx.stroke();
 ctx.font='18px system-ui, sans-serif';ctx.fillStyle='#748097';ctx.fillText(capture.kind==='local'?'Example capture · illustrative device frame':'Website snapshot · top of page · illustrative device frame',80,1124);
 if(capture.attribution){ctx.font='15px system-ui, sans-serif';ctx.fillText(capture.attribution,80,1156);}
 if(credit){ctx.textAlign='right';ctx.fillStyle='#315ef5';ctx.font='600 21px system-ui, sans-serif';ctx.fillText('Made with Duo View',1520,1124);ctx.font='18px system-ui, sans-serif';ctx.fillStyle='#748097';ctx.fillText('duo-view.netlify.app',1520,1156);}
 checkAbort(signal);
 return new Promise((resolve,reject)=>{
  try{canvas.toBlob(blob=>{if(signal?.aborted)reject(abortError());else if(blob)resolve(blob);else reject(new Error('The PNG could not be created. Try another browser.'));},'image/png');}
  catch{reject(new Error('This screenshot blocks downloadable image access (CORS). Try another website or an example.'));}
 });
}

/** Adds the dialog and returns {open,destroy}. No public capture runs until Create image.
 * getState returns the simulator state. Optional getExistingCapture and getLocalCapture
 * receive {state,size,signal}; helpers above return compatible records.
 */
export function bindPreviewExport({trigger,getState,getExistingCapture,getLocalCapture,onEvent=()=>{}}){
 if(!trigger)throw new Error('An export trigger is required.');
 const dialog=document.createElement('dialog');dialog.className='export-dialog';dialog.setAttribute('aria-labelledby','export-title');
 dialog.innerHTML=`<div class="export-heading"><div><span class="export-eyebrow">READY TO SHARE</span><h2 id="export-title">Export an image</h2></div><button type="button" class="export-close" aria-label="Close image export">×</button></div><p class="export-intro">A website snapshot in a device frame, ready for your next post.</p><div class="export-options"><label>Device frame<select aria-label="Export device frame"><option value="open">Open</option><option value="folded">Folded</option><option value="tabletop">Tabletop</option></select></label><label class="export-credit"><input type="checkbox" checked> Made with Duo View credit</label></div><p class="export-viewport"></p><div class="export-artboard"><div class="export-empty"><span aria-hidden="true">↗</span><strong>Your preview, ready to share.</strong><p>Choose a frame, then create your image.</p></div><img alt="Generated website preview in a Duo View device frame" hidden></div><p class="export-feedback" role="status" aria-live="polite"></p><div class="export-actions"><button type="button" class="export-create">Create image</button><a class="export-download" aria-disabled="true" tabindex="-1">Download PNG</a><button type="button" class="export-cancel" hidden>Cancel</button></div><p class="export-note"></p>`;
 document.body.append(dialog);
 const find=selector=>dialog.querySelector(selector),pose=find('select'),credit=find('input'),create=find('.export-create'),download=find('.export-download'),cancel=find('.export-cancel'),img=find('img'),empty=find('.export-empty'),status=find('.export-feedback');
 let frozen=null,controller=null,objectUrl=null,generation=0,destroyed=false;
 const cache=new Map();
 const revoke=()=>{if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}img.hidden=true;img.removeAttribute('src');empty.hidden=false;download.removeAttribute('href');download.setAttribute('aria-disabled','true');download.tabIndex=-1;};
 const stop=()=>{generation++;controller?.abort();controller=null;create.disabled=false;cancel.hidden=true;pose.disabled=false;credit.disabled=false;dialog.removeAttribute('aria-busy');};
 const configuration=()=>exportConfiguration(frozen,pose.value);
 function refresh(){
  const config=configuration();find('.export-viewport').textContent=`${config.size.width} × ${config.size.contentHeight} CSS px · ${frozen.orientation==='portrait'?'Portrait':'Landscape'} · 1600 × 1200 PNG`;
  find('.export-note').textContent=frozen.content==='player'?'Captures the current demo picture and controls in a styled frame. The camera angle is not copied.':'Captures the top of the page in a styled frame. Camera angle, scroll position, and signed-in sessions are not copied. Public websites are captured by Microlink; built-in examples are captured locally.';
 }
 function reset(){stop();revoke();status.textContent='';create.textContent='Create image';refresh();}
 function open(){
  if(destroyed)return;
  try{frozen={...getState()};if(frozen.custom)frozen.custom={...frozen.custom};pose.value=frozen.display==='folded'?'folded':frozen.pose==='tabletop'?'tabletop':'open';reset();dialog.showModal();onEvent('duo_export_opened');}
  catch(error){status.textContent=error.message;dialog.showModal();}
 }
 async function generate(){
  stop();revoke();const run=++generation;controller=new AbortController();const signal=controller.signal;
  create.disabled=true;pose.disabled=true;credit.disabled=true;cancel.hidden=false;dialog.setAttribute('aria-busy','true');status.textContent='Creating your image… Public websites may take up to a minute.';
  const captureController=controller;const timer=setTimeout(()=>captureController.abort(),65000);
  try{
   const config=configuration(),key=JSON.stringify([config.state.url,config.state.content,config.size.width,config.size.contentHeight]);
   let capture=cache.get(key);
   // Video exports refresh on every request so the image reflects the current frame.
   if(!capture||config.state.content==='player'){
    capture=await acquireExportCapture({...config,signal,getExistingCapture,getLocalCapture});
    if(config.state.content!=='player'){cache.set(key,capture);if(cache.size>8)cache.delete(cache.keys().next().value);}
   }
   const blob=await renderExportCard(capture,{...config,credit:credit.checked,signal});
   if(run!==generation||!dialog.open)return;
   objectUrl=URL.createObjectURL(blob);img.src=objectUrl;img.hidden=false;empty.hidden=true;
   download.href=objectUrl;download.download=exportFilename(config.state,config.pose);download.setAttribute('aria-disabled','false');download.tabIndex=0;
   create.textContent='Create again';status.textContent='Your PNG is ready to download.';onEvent('duo_export_created',{pose:config.pose});
  }catch(error){
   if(run!==generation||!dialog.open)return;
   status.textContent=error.name==='AbortError'?'Image creation timed out. Please try again.':error.message;
   create.textContent='Try again';onEvent('duo_export_failed');
  }finally{clearTimeout(timer);if(run===generation){controller=null;create.disabled=false;pose.disabled=false;credit.disabled=false;cancel.hidden=true;dialog.removeAttribute('aria-busy');}}
 }
 const close=()=>dialog.close();
 const closeCleanup=()=>{stop();revoke();};
 const cancelCapture=()=>{stop();status.textContent='Image creation cancelled. Choose Create image to try again.';};
 const downloadClick=event=>{if(!objectUrl)event.preventDefault();else onEvent('duo_export_downloaded');};
 trigger.addEventListener('click',open);find('.export-close').addEventListener('click',close);dialog.addEventListener('close',closeCleanup);
 pose.addEventListener('change',reset);credit.addEventListener('change',reset);create.addEventListener('click',generate);cancel.addEventListener('click',cancelCapture);download.addEventListener('click',downloadClick);
 return {open,destroy(){destroyed=true;stop();revoke();cache.clear();trigger.removeEventListener('click',open);dialog.remove();}};
}

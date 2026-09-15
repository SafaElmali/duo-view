import {bindMobileControls} from './mobile-controls.mjs';
import {initAnalytics,bindAnalyticsControls,track} from './analytics.mjs';
import {createDuoViewer} from './duo-3d.mjs';
import {dimensions,validDimension,normalizeUrl,fitScale,isBuiltInWebsite} from './simulator.mjs';
import {captureSnapshot,snapshotDocument,validateSnapshotUrl} from './snapshot.mjs';
import {createEmbedFallback} from './embed-fallback.mjs';
import {bindPreviewModePicker} from './preview-mode-picker.mjs';
import {DEFAULT_PREVIEW,createPreviewLink,readPreviewLink,bindPreviewSharing} from './share-preview.mjs';
import {navigatePreviewFrame} from './preview-frame.mjs';
import {bindExampleGallery,matchExampleUrl,resolveExampleUrl} from './example-gallery.mjs';
import {bindPreviewAnnotations} from './preview-annotations.mjs';
import {bindPreviewExport,captureLocalPage,capturePlayerPreview} from './export-preview.mjs';
import {comparisonDevices,bindPhoneComparison} from './phone-comparison.mjs';
import {bindPreviewEmbedding,initEmbeddedPreview} from './embed-preview.mjs';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const demoUrl=new URL('demo.html',location.href).href;
const state={...DEFAULT_PREVIEW,url:demoUrl};
let modelViewer=null;
let modePicker=null;
let modelFailed=false;
const frame=$('#site-frame');
let comparisonFrames=[];
let comparisonSignature='',comparisonController=null;
let resizeFrame=0;
let annotationController=null,annotationContext=null;
let embeddedController=null;
const title=(display,orientation)=>`${display==='folded'?'Folded':'Open'} · ${orientation==='portrait'?'Portrait':'Landscape'}`;
const isDemo=()=>isBuiltInWebsite(state.url,location.href);
const sourceName=()=>state.content==='player'?'Streaming demo':matchExampleUrl(state.url,location.href)?.title??(isDemo()?'Demo website':new URL(state.url).hostname);
const isSnapshot=()=>state.mode==='snapshot'&&!isDemo()&&state.content==='website';
const captures=new Map();
let automaticSnapshotUrl=null,automaticSnapshotReason=null;
function automaticSnapshot(url,reason){
 if(state.url!==url||state.mode!=='embedded'||state.content!=='website')return;
 automaticSnapshotUrl=url;automaticSnapshotReason=reason;state.mode='snapshot';track('duo_preview_fallback',{reason});update();
}
function previewTimedOut(url){
 if(state.url!==url||state.mode!=='embedded'||state.content!=='website'||isDemo())return;
 try{validateSnapshotUrl(url);if(new URL(url).port)return;}catch{return;}
 automaticSnapshot(url,'load-timeout');
}
const embedFallback=createEmbedFallback({
 onChange:()=>renderPreviewMode(),
 onBlocked:url=>automaticSnapshot(url,'blocked'),
 onUnavailable:url=>automaticSnapshot(url,'file-preview')
});
function captureKey(size){return `${state.url}|${size.width}|${size.contentHeight}`;}
function getCapture(size){
 const key=captureKey(size);if(captures.has(key))return captures.get(key);
 const record={pending:true},startedAt=performance.now();captures.set(key,record);
 const captureContext={...analyticsContext(),width:size.width,height:size.contentHeight};
 track('duo_snapshot_started',captureContext);
 if(captures.size>16){const oldest=captures.keys().next().value;captures.get(oldest).controller?.abort();captures.delete(oldest);}
 const controller=new AbortController();record.controller=controller;const timer=setTimeout(()=>controller.abort(),55000);
 captureSnapshot(state.url,size,controller.signal).then(result=>Object.assign(record,result,{pending:false}),error=>Object.assign(record,{pending:false,error:error.name==='AbortError'?'Capture timed out. Try again using Reload preview.':error.message})).finally(()=>{clearTimeout(timer);if(!controller.signal.aborted||performance.now()-startedAt>=55000)track(record.image?'duo_snapshot_ready':'duo_snapshot_failed',{...captureContext,duration_ms:Math.round(performance.now()-startedAt)});if(captures.get(key)===record&&isSnapshot()){syncFrameSources();updateModel();renderPreviewMode();}});
 return record;
}
function setFrameSource(iframe,size){
 navigatePreviewFrame(iframe,{url:state.url,html:isSnapshot()?snapshotDocument(getCapture(size)):null,onTimeout:previewTimedOut});
}
function syncFrameSources(){
 if(state.view!=='compare')setFrameSource(frame,dimensions(state.display,state.orientation,state.chrome,state.custom));
 if(state.view==='compare')for(const item of comparisonFrames)setFrameSource(item.iframe,item.size);
}
function renderPreviewMode(){
 $('#preview-mode').value=state.mode;modePicker?.sync();
 $('#embed-notice').hidden=isDemo()||isSnapshot()||state.content==='player';
 const checking=embedFallback.getState();
 $('#embed-message').textContent=checking==='checking'?'Checking whether this page allows live preview…':checking==='local'?'Live preview only for local or private URLs.':checking==='unknown'?'Could not check this page. Trying live preview…':'Live preview · Blocked or stalled pages switch to a snapshot.';
 $('#embed-fallback').disabled=checking==='local';
 $('#snapshot-notice').hidden=!isSnapshot();
 $('#snapshot-reason').textContent=automaticSnapshotUrl===state.url?(automaticSnapshotReason==='file-preview'?'File preview · Showing a scrollable snapshot.':automaticSnapshotReason==='load-timeout'?'Live preview took too long. Showing a scrollable snapshot.':'This site blocks live preview. Showing a scrollable snapshot.'):'Scrollable snapshot';
 if(isSnapshot()){
  const record=captures.get(captureKey(dimensions(state.display,state.orientation,state.chrome,state.custom)));
  $('#snapshot-status').textContent=record?.error?'Capture unavailable':record?.image?(record.height>dimensions(state.display,state.orientation,state.chrome,state.custom).contentHeight?'Ready · Scroll on the phone':'Ready · Single-screen capture'):'Rendering…';
 }
}
function changeMode(mode){
 if(!['embedded','snapshot'].includes(mode))throw new Error('Choose Live preview or Snapshot.');
 if(mode==='snapshot'&&isDemo()&&state.content==='website')throw new Error('Examples run in Live preview. Enter a public website to create a snapshot.');
 if(state.content==='website'&&!isDemo()){
  if(mode==='snapshot')validateSnapshotUrl(state.url);
  else normalizeUrl(state.url,location.href,{embedded:true});
 }
 if(mode==='embedded')embedFallback.retry();
 automaticSnapshotUrl=null;state.mode=mode;update();
}
$('#embed-fallback').addEventListener('click',()=>{try{changeMode('snapshot');}catch(error){urlError(error.message);}});
$('#preview-mode').addEventListener('change',event=>{try{changeMode(event.target.value);}catch(error){event.target.value=state.mode;urlError(error.message);}});
modePicker=bindPreviewModePicker($('#preview-mode'));

function selected(attribute,value){$$(`[${attribute}]`).forEach(button=>{const active=button.getAttribute(attribute)===value;button.classList.toggle('active',active);if(attribute==='data-finish')button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});}
function update(){
  selected('data-display',state.display);selected('data-orientation',state.orientation);selected('data-view',state.view);
  const size=dimensions(state.display,state.orientation,state.chrome,state.custom);
  const nextAnnotationContext=JSON.stringify([state.url,state.content,state.display,state.orientation,state.chrome,size.width,size.height]);
  if((annotationContext!==null&&annotationContext!==nextAnnotationContext)||state.view!=='single'){
   state.annotation=null;annotationController?.cancel({focus:false});
  }
  annotationContext=nextAnnotationContext;
  $('#viewport-width').value=size.width;$('#viewport-height').value=size.height;
  $('#view-title').textContent=title(state.display,state.orientation);
  $('#view-subtitle').textContent=`${size.width} × ${size.contentHeight} CSS px${state.custom?' · custom':''}`;
  $('#footer-state').textContent=`${state.display==='folded'?'Outer':'Inner'} display · ${state.orientation==='portrait'?'Portrait':'Landscape'}`;
  $('#viewport-readout').textContent=state.view==='compare'?(state.comparison==='phone'?'Phone and Duo viewports':'Four preset viewports'):`Viewport: ${size.width} × ${size.contentHeight} CSS px`;
  $('#duo-three-scene').hidden=state.view!=='three';
  $('#model-controls').hidden=state.view!=='three';
  $('#duo-state-label').textContent=`${state.pose==='tabletop'?'Tabletop':state.pose==='book'?'Book':title(state.display,state.orientation)} · ${Math.round(state.foldAngle)}°`;
  selected('data-pose',state.pose);
  selected('data-finish',state.finish);
  $$('[data-player-demo]').forEach(button=>button.setAttribute('aria-pressed',String(state.content==='player')));
  $('#demo').setAttribute('aria-pressed',String(state.content==='website'));
  $('#preview-status').textContent=sourceName();
  $('#duo-render-host').classList.toggle('tabletop-pose',state.pose==='tabletop');
  $('#fold-angle').value=String(state.foldAngle);
  $('#fold-angle-output').value=`${Math.round(state.foldAngle)}°`;
  $('#single-scene').hidden=state.view!=='single';$('#comparison').hidden=state.view!=='compare';
  $('#chrome-toggle').checked=state.chrome;$('#hinge-toggle').checked=state.hinge;
  $('#hinge-toggle').disabled=state.display==='folded'&&state.view==='single';
  if(state.view==='compare'){
   const devices=comparisonDevices(state),signature=JSON.stringify(devices);
   if(signature!==comparisonSignature){buildComparison(devices);comparisonSignature=signature;}
  }
  $('#comparison').classList.toggle('comparison--phone',state.comparison==='phone');
  comparisonController?.update();
  $('#annotate-preview').disabled=state.content!=='website';
  $('#annotate-preview').title=state.content==='website'?'':'Choose a website or example to add a layout note.';
  syncFrameSources();
  renderPreviewMode();
  updateModel();
  annotationController?.update();
  embeddedController?.update();
  requestFit();
  embedFallback.update(state.url,state.content==='website'&&!isDemo()&&state.mode==='embedded');
}
function configureDevice(device,size,display,orientation){
  device.style.width=`${size.outerWidth}px`;device.style.height=`${size.outerHeight}px`;
  const iframe=device.querySelector('iframe');iframe.width=String(size.width);iframe.height=String(size.contentHeight);iframe.style.width=`${size.width}px`;iframe.style.height=`${size.contentHeight}px`;
  device.querySelectorAll('.browser-chrome,.browser-bottom').forEach(element=>element.hidden=!state.chrome);
  const hinge=device.querySelector('.hinge');hinge.hidden=display==='folded'||!state.hinge;hinge.classList.toggle('horizontal',orientation==='portrait');
  const host=device.querySelector('.browser-address>span:nth-child(2)');if(host)host.textContent=isDemo()?sourceName():new URL(state.url).host;
}
function requestFit(){if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;fit();});}
function fit(){
  if(state.view==='three')return;
  const stage=$('#stage');
  if(state.view==='single'){
    const size=dimensions(state.display,state.orientation,state.chrome,state.custom);
    const availableWidth=Math.max(260,stage.clientWidth-(innerWidth<700?28:70));
    const notePanel=$('#single-scene .preview-annotation-panel:not([hidden])');
    const noteHeight=notePanel?notePanel.offsetHeight+22:0;
    const availableHeight=Math.max(160,stage.clientHeight-145-noteHeight);
    const scale=fitScale(size,availableWidth,availableHeight,state.zoom);
    const device=$('#device');configureDevice(device,size,state.display,state.orientation);
    device.style.transform=`scale(${scale})`;
    $('#device-space').style.width=`${size.outerWidth*scale}px`;$('#device-space').style.height=`${size.outerHeight*scale}px`;
    annotationController?.update();
  }else{
    const phoneMode=state.comparison==='phone';
    const availableHeight=innerWidth<700?470:Math.max(160,phoneMode?stage.clientHeight-155:(stage.clientHeight-145)/2);
    const commonScale=phoneMode?Math.min(...comparisonFrames.map(item=>fitScale(item.size,item.card.clientWidth-30,availableHeight,state.zoom))):null;
    for(const item of comparisonFrames){
      const size=item.size;
      const scale=commonScale??fitScale(size,item.card.clientWidth-30,availableHeight,state.zoom);
      configureDevice(item.device,size,item.display,item.orientation);
      item.device.style.transform=`scale(${scale})`;item.space.style.width=`${size.outerWidth*scale}px`;item.space.style.height=`${size.outerHeight*scale}px`;
      item.subtitle.textContent=`${size.width} × ${size.contentHeight} CSS px`;
    }
  }
}
function buildComparison(devices){
  for(const item of comparisonFrames)navigatePreviewFrame(item.iframe,{url:'about:blank'});
  comparisonFrames=[];$('#comparison').replaceChildren();
  for(const descriptor of devices){
    const {display,orientation,size,label,reference}=descriptor;
    const card=document.createElement('section');card.className='compare-card';
    card.classList.toggle('compare-card--reference',reference);
    const heading=document.createElement('div');heading.className='view-title';
    const name=document.createElement('h2');name.textContent=label;const subtitle=document.createElement('p');heading.append(name,subtitle);
    const space=document.createElement('div');space.className='device-space';
    const device=$('#device').cloneNode(true);device.removeAttribute('id');device.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
    device.querySelectorAll('.preview-annotation-layer').forEach(element=>element.remove());
    const iframe=device.querySelector('iframe');iframe.title=`Your website: ${label}`;setFrameSource(iframe,size);
    space.append(device);card.append(heading,space);$('#comparison').append(card);
    comparisonFrames.push({...descriptor,card,device,space,iframe,subtitle});
  }
}
function changeDisplay(display){state.pose='flat';if(!['folded','open'].includes(display))throw new Error('Choose folded or open.');state.display=display;state.foldAngle=display==='folded'?0:180;state.custom=null;clearDimensionError();update();}
function changeOrientation(orientation){if(!['portrait','landscape'].includes(orientation))throw new Error('Choose portrait or landscape.');state.orientation=orientation;state.custom=null;clearDimensionError();update();}
function changeView(view){if(view!=='three')state.content='website';if(!['three','single','compare'].includes(view))throw new Error('Choose 3D model, 2D preview, or compare.');state.view=view;update();}
function loadWebsite(url){
  const mode=isBuiltInWebsite(url,location.href)||automaticSnapshotUrl?'embedded':state.mode;
  if(mode==='snapshot'&&!isBuiltInWebsite(url,location.href))validateSnapshotUrl(url);
  if(mode==='embedded')normalizeUrl(url,location.href,{embedded:true});
  automaticSnapshotUrl=null;state.mode=mode;
  state.content='website';state.url=url;track('duo_preview_requested');
  $('#preview-status').textContent=sourceName();
  $('#site-url').value=isDemo()?'':url;$('#url-error').hidden=true;update();
}
function urlError(message){track('duo_preview_validation_failed');$('#url-error').textContent=message;$('#url-error').hidden=false;$('#site-url').setAttribute('aria-invalid','true');}
$('#url-form').addEventListener('submit',event=>{event.preventDefault();try{const url=normalizeUrl($('#site-url').value,location.href,{embedded:state.mode==='embedded'});loadWebsite(url);$('#site-url').removeAttribute('aria-invalid');}catch(error){urlError(error.message);}});
$('#demo').addEventListener('click',()=>{
 state.content='website';
 $('#url-error').hidden=true;$('#site-url').removeAttribute('aria-invalid');
 update();
});
$('#reload').addEventListener('click',()=>{
 if(isSnapshot()){for(const [key,record]of captures)if(key.startsWith(state.url+'|')){record.controller?.abort();captures.delete(key);}update();return;}
 modelViewer?.reload();for(const iframe of [frame,...comparisonFrames.map(item=>item.iframe)])navigatePreviewFrame(iframe,{url:state.url,onTimeout:previewTimedOut,force:true});
 embedFallback.retry();update();
});
$$('[data-display]').forEach(button=>button.addEventListener('click',()=>changeDisplay(button.dataset.display)));
$$('[data-orientation]').forEach(button=>button.addEventListener('click',()=>changeOrientation(button.dataset.orientation)));
$$('[data-view]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.view)));
$('#chrome-toggle').addEventListener('change',event=>{state.chrome=event.target.checked;update();});
$('#hinge-toggle').addEventListener('change',event=>{state.hinge=event.target.checked;update();});
function clearDimensionError(){$('#dimension-error').hidden=true;$('#viewport-width').removeAttribute('aria-invalid');$('#viewport-height').removeAttribute('aria-invalid');}
for(const selector of ['#viewport-width','#viewport-height'])$(selector).addEventListener('change',()=>{
  const width=Number($('#viewport-width').value),height=Number($('#viewport-height').value);
  if(!validDimension(width)||!validDimension(height)){$('#dimension-error').textContent='Use whole numbers from 240 to 1600.';$('#dimension-error').hidden=false;$(selector).setAttribute('aria-invalid','true');return;}
  clearDimensionError();state.custom={width,height};
  if(state.view!=='compare'||state.comparison!=='phone')state.view='single';
  update();
});
$('#reset-dimensions').addEventListener('click',()=>{state.custom=null;clearDimensionError();update();});
function showInfo(){$('#info-dialog').showModal();}
['about-button','limits-button','help-button'].forEach(id=>$(`#${id}`).addEventListener('click',showInfo));
$('#close-dialog').addEventListener('click',()=>$('#info-dialog').close());
$('#info-dialog').addEventListener('click',event=>{if(event.target===$('#info-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
$('#fullscreen').addEventListener('click',async()=>{
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  if($('#workspace').requestFullscreen){try{await $('#workspace').requestFullscreen();return;}catch{}}
  document.body.classList.toggle('preview-expanded');requestFit();
});
document.addEventListener('fullscreenchange',()=>{const expanded=Boolean(document.fullscreenElement);$('#fullscreen').setAttribute('aria-label',expanded?'Exit expanded preview':'Expand preview');requestFit();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){document.body.classList.remove('preview-expanded');requestFit();}
  if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,select,textarea,[contenteditable]')||document.querySelector('dialog[open]'))return;
  if(event.key.toLowerCase()==='r'){event.preventDefault();track('duo_keyboard_shortcut',{control:'orientation'});changeOrientation(state.orientation==='portrait'?'landscape':'portrait');}
  if(event.key.toLowerCase()==='f'){event.preventDefault();track('duo_keyboard_shortcut',{control:'display'});changeDisplay(state.display==='folded'?'open':'folded');}
});
new ResizeObserver(requestFit).observe($('#stage'));
window.addEventListener('resize',requestFit);
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='duoview:viewport'||!isDemo()||state.view!=='single')return;
  if(!Number.isInteger(event.data.width)||!Number.isInteger(event.data.height))return;
  $('#viewport-readout').textContent=`Live viewport: ${event.data.width} × ${event.data.height}`;
});
function canSnapshotWebsite(){
 if(isDemo()||state.content!=='website')return false;
 try{validateSnapshotUrl(state.url);return true;}catch{return false;}
}
function scrollWebsitePreview(){
 try{
  if(isSnapshot()){
   const key=captureKey(dimensions(state.display,state.orientation,state.chrome,state.custom));
   if(captures.get(key)?.pending)return;
   captures.get(key)?.controller?.abort();captures.delete(key);update();
  }else changeMode('snapshot');
  track('duo_scroll_preview_requested');
 }catch(error){urlError(error.message);}
}
function openWebsiteFlat(){
 state.display='open';state.pose='flat';state.foldAngle=180;state.view='three';state.content='website';
 changeMode('embedded');modelViewer?.reset();modelViewer?.useWebsite();
 track('duo_open_flat_clicked');
}
function updateModel(){
  if(state.view==='three'&&!modelViewer&&!modelFailed){
    try{modelViewer=createDuoViewer($('#duo-render-host'),{onScrollPreview:scrollWebsitePreview,onOpenFlat:openWebsiteFlat});}
    catch(error){modelFailed=true;$('#duo-render-host .duo-model-message').textContent='3D graphics are unavailable in this browser. The 2D preview is still available.';console.warn('3D preview unavailable',error);}
  }
  if(modelViewer){
    const size=dimensions(state.display,state.orientation,state.chrome,state.custom);
    const snapshot=isSnapshot()&&state.view==='three'?{...getCapture(size),key:captureKey(size),contentHeight:size.contentHeight}:null;
    modelViewer.update({...state,demo:isDemo(),canSnapshot:canSnapshotWebsite(),snapshot,snapshotPage:snapshot?snapshotDocument(snapshot):null,onPreviewTimeout:previewTimedOut});modelViewer.setActive(state.view==='three');
  }
}
$('#fold-angle').addEventListener('input',event=>{state.foldAngle=Number(event.target.value);state.display=state.foldAngle<4?'folded':'open';state.custom=null;update();});
$$('[data-finish]').forEach(button=>button.addEventListener('click',()=>{state.finish=button.dataset.finish;$$('[data-finish]').forEach(item=>{const active=item.dataset.finish===state.finish;item.classList.toggle('selected',active);item.setAttribute('aria-pressed',String(active));});updateModel();}));
$$('[data-pose]').forEach(button=>button.addEventListener('click',()=>setPose(button.dataset.pose)));
function setPose(pose){state.pose=pose;state.display='open';state.view='three';state.orientation=pose==='tabletop'?'portrait':'landscape';state.foldAngle=pose==='flat'?180:pose==='tabletop'?100:115;state.custom=null;update();modelViewer?.reset();}
$$('[data-player-demo]').forEach(button=>button.addEventListener('click',()=>{
 state.content='player';state.finish='night';setPose('tabletop');modelViewer?.startPlayer();
 $('#url-error').hidden=true;$('#site-url').removeAttribute('aria-invalid');
}));
function analyticsContext(){return {display:state.display,orientation:state.orientation,view:state.view,mode:state.mode,content:state.content,pose:state.pose,finish:state.finish,source:isDemo()?'demo':'custom',width:dimensions(state.display,state.orientation,state.chrome,state.custom).width,height:dimensions(state.display,state.orientation,state.chrome,state.custom).contentHeight};}
initAnalytics(analyticsContext);
bindAnalyticsControls(document);
bindMobileControls();
comparisonController=bindPhoneComparison({host:$('#comparison-options'),getState:()=>state,onChange:patch=>{Object.assign(state,patch);update();track('duo_comparison_changed');}});
for(const id of ['export-preview','annotate-preview','embed-preview'])$('#'+id).addEventListener('click',()=>$('#share-dialog').close());
bindExampleGallery({trigger:$('#example-gallery'),onSelect:example=>{
 Object.assign(state,{mode:'embedded',content:'website',view:'three',display:'open',orientation:'landscape',pose:'flat',foldAngle:180,custom:null,annotation:null});
 clearDimensionError();
 loadWebsite(resolveExampleUrl(example.id,location.href));modelViewer?.reset();modelViewer?.useWebsite();track('duo_example_opened');
}});
annotationController=bindPreviewAnnotations({
 trigger:$('#annotate-preview'),returnFocus:$('#share-preview'),container:$('#single-scene'),getFrame:()=>frame,getState:()=>state,
 onChange:annotation=>{state.annotation=annotation;update();track('duo_annotation_changed',{enabled:Boolean(annotation)});},
 onRequestPreview:()=>{state.view='single';state.content='website';update();}
});
bindPreviewExport({trigger:$('#export-preview'),getState:()=>({...state}),onEvent:track,
 getExistingCapture:({state:preview,size})=>captures.get(`${preview.url}|${size.width}|${size.contentHeight}`),
 getLocalCapture:({state:preview,size,signal})=>{
  if(preview.content==='player')return capturePlayerPreview({root:$('#duo-render-host'),size,orientation:preview.orientation,signal});
  if(isBuiltInWebsite(preview.url,location.href))return captureLocalPage(preview.url,{size,signal});
  return null;
 }
});
function getPreview(){
  const source=sourceName();
  const layout=state.view==='three'?`${state.pose==='tabletop'?'Tabletop':state.pose==='book'?'Book':state.display==='folded'?'Folded':'Flat'} · ${Math.round(state.foldAngle)}°`:state.view==='single'?'2D preview':state.comparison==='phone'?'Phone vs Duo':'All Duo views';
  const size=dimensions(state.display,state.orientation,state.chrome,state.custom);
  const viewport=state.view==='compare'?(state.comparison==='phone'?comparisonDevices(state).map(item=>`${item.size.width} × ${item.size.contentHeight}`).join(' / ')+' CSS px':'Four preset viewports'):`${size.width} × ${size.contentHeight} CSS px`;
  return {url:createPreviewLink(state,{href:location.href,demoUrl,camera:modelViewer?.getCamera()}),summary:`${source} · ${layout} · ${state.orientation==='portrait'?'Portrait':'Landscape'} · ${viewport}${state.annotation?' · Includes a layout note':''}`};
}
bindPreviewSharing({getPreview,onEvent:track});
bindPreviewEmbedding({getPreview,onEvent:track});
function restoreSharedPreview(){
 let shared;
 try{shared=readPreviewLink(location.hash,{base:location.href,demoUrl});}
 catch(error){urlError(error.message);return false;}
 if(!shared)return false;
 automaticSnapshotUrl=null;automaticSnapshotReason=null;
 annotationContext=null;
 // Older links may include the retired toolbar zoom; all page previews now fit automatically.
 Object.assign(state,shared.state,{zoom:'fit'});
 $('#site-url').value=isDemo()?'':state.url;
 $('#url-error').hidden=true;$('#site-url').removeAttribute('aria-invalid');clearDimensionError();
 embedFallback.retry();update();
 if(shared.camera&&state.view==='three')modelViewer?.restoreCamera(shared.camera);
 track('duo_shared_preview_opened');return true;
}
window.addEventListener('hashchange',restoreSharedPreview);
if(!restoreSharedPreview())update();
embeddedController=initEmbeddedPreview({getPreview,getState:()=>state,onEvent:track,onConfigure:patch=>{
 Object.assign(state,patch,{custom:null});clearDimensionError();update();modelViewer?.reset();
}});

// Optional imperative tools share the same validated state transitions as the controls.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const previewTool={name:'configure_website_preview',title:'Configure website preview',description:'Show a website inside the iPhone Duo preview. Live preview checks public URLs for embedding restrictions through Duo View and automatically sends public URLs to Microlink for a scrollable snapshot when embedding is blocked or live navigation takes more than 15 seconds. Snapshot mode requests Microlink directly. Snapshot links are not interactive; local and private URLs stay in Live preview.',inputSchema:{type:'object',properties:{url:{type:'string'},display:{type:'string',enum:['folded','open']},orientation:{type:'string',enum:['portrait','landscape']},view:{type:'string',enum:['three','single','compare']},foldAngle:{type:'number',minimum:0,maximum:180},finish:{type:'string',enum:['white','night']},pose:{type:'string',enum:['tabletop','book','flat']},content:{type:'string',enum:['website','player']},mode:{type:'string',enum:['embedded','snapshot']}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){
    if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['url','display','orientation','view','foldAngle','finish','pose','content','mode'].includes(key)))throw new Error('Invalid preview options.');
    if(input.display!==undefined&&!['folded','open'].includes(input.display))throw new Error('Invalid display.');
    if(input.orientation!==undefined&&!['portrait','landscape'].includes(input.orientation))throw new Error('Invalid orientation.');
    if(input.view!==undefined&&!['three','single','compare'].includes(input.view))throw new Error('Invalid view.');
    if(input.foldAngle!==undefined&&(typeof input.foldAngle!=='number'||!Number.isFinite(input.foldAngle)||input.foldAngle<0||input.foldAngle>180))throw new Error('Fold angle must be between 0 and 180.');
    if(input.finish!==undefined&&!['white','night'].includes(input.finish))throw new Error('Unknown finish.');
    if(input.pose!==undefined&&!['tabletop','book','flat'].includes(input.pose))throw new Error('Unknown pose.');
    if(input.content!==undefined&&!['website','player'].includes(input.content))throw new Error('Unknown screen content.');
    const mode=input.mode??(input.url!==undefined&&automaticSnapshotUrl?'embedded':state.mode);if(!['embedded','snapshot'].includes(mode))throw new Error('Unknown preview mode.');
    const url=input.url!==undefined?normalizeUrl(input.url,location.href,{embedded:mode==='embedded'}):null;
    if(mode==='snapshot'&&!isBuiltInWebsite(url||state.url,location.href))validateSnapshotUrl(url||state.url);
    if(mode==='embedded'&&!isBuiltInWebsite(url||state.url,location.href))normalizeUrl(url||state.url,location.href,{embedded:true});
    if(input.mode!==undefined||input.url!==undefined)automaticSnapshotUrl=null;state.mode=mode;
    if(input.pose){state.pose=input.pose;state.display='open';state.orientation=input.pose==='tabletop'?'portrait':'landscape';state.foldAngle=input.pose==='flat'?180:input.pose==='tabletop'?100:115;}
    if(input.content)state.content=input.content;if(input.pose||input.content==='player')state.view='three';
    if(input.display){state.display=input.display;state.foldAngle=input.display==='folded'?0:180;}if(input.orientation)state.orientation=input.orientation;if(input.view)state.view=input.view;
    if(input.foldAngle!==undefined){state.foldAngle=input.foldAngle;state.display=input.foldAngle<4?'folded':'open';}
    if(input.finish)state.finish=input.finish;
    $$('[data-finish]').forEach(item=>{const active=item.dataset.finish===state.finish;item.classList.toggle('selected',active);item.setAttribute('aria-pressed',String(active));});
    state.custom=null;if(url)loadWebsite(url);else update();
    return {display:state.display,orientation:state.orientation,view:state.view,viewport:dimensions(state.display,state.orientation,state.chrome),model:modelViewer?.getState(),content:state.content,pose:state.pose,url:state.url,mode:state.mode,navigationStatus:url?'requested':'unchanged'};
  }};
  try{Promise.resolve(document.modelContext.registerTool(previewTool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

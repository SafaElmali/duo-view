export const MAX_ANNOTATION_NOTE_LENGTH=500;
const MIN_REGION=.001;
const fields=['x','y','width','height'];
const invalid=()=>new Error('Use a note of up to 500 characters and a highlight inside the viewport.');
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const round=value=>Math.round(value*100000)/100000;

// Shared annotations contain only text and viewport-relative geometry. Never
// interpret notes as HTML, selectors, URLs, or instructions for the preview.
export function validateAnnotation(value){
 if(value===null||value===undefined)return null;
 if(!record(value)||Object.keys(value).some(key=>!['note','rect'].includes(key))||typeof value.note!=='string'||value.note.length>MAX_ANNOTATION_NOTE_LENGTH)throw invalid();
 const note=value.note.trim();let rect=null;
 if(value.rect!==null&&value.rect!==undefined){
  const region=value.rect;
  if(!record(region)||Object.keys(region).length!==4||fields.some(key=>typeof region[key]!=='number'||!Number.isFinite(region[key]))||region.x<0||region.y<0||region.width<MIN_REGION||region.height<MIN_REGION||region.x+region.width>1+1e-9||region.y+region.height>1+1e-9)throw invalid();
  rect=Object.fromEntries(fields.map(key=>[key,round(region[key])]));
  // Rounding a starting edge and its width independently must never move the
  // other edge outside the viewport when the link is validated again.
  rect.width=Math.min(rect.width,round(1-rect.x));rect.height=Math.min(rect.height,round(1-rect.y));
 }
 if(!note&&!rect)throw invalid();
 return {note,rect};
}

export function normalizeAnnotation(value){
 try{return validateAnnotation(value);}catch{return null;}
}

// Coordinates come from pointer events in the transformed preview. Measuring
// the actual iframe keeps highlights independent of CSS scale and browser chrome.
export function annotationRegionFromPoints(start,end,bounds){
 if(!start||!end||!bounds||![start.x,start.y,end.x,end.y,bounds.left,bounds.top,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)return null;
 const point=value=>({x:Math.min(1,Math.max(0,(value.x-bounds.left)/bounds.width)),y:Math.min(1,Math.max(0,(value.y-bounds.top)/bounds.height))});
 const a=point(start),b=point(end);
 const rect={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};
 return normalizeAnnotation({note:'',rect})?.rect??null;
}

function contextKey(state){
 return JSON.stringify([state.url,state.display,state.orientation,state.chrome,state.custom?.width,state.custom?.height,state.content]);
}

export function bindPreviewAnnotations({trigger,returnFocus=trigger,container,getFrame,getState,onChange,onRequestPreview=()=>{}}){
 const doc=container.ownerDocument,win=doc.defaultView;
 const node=(tag,className,text)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
 const button=(text,className='')=>{const element=node('button',className,text);element.type='button';return element;};
 const shell=node('section','preview-annotation-panel');shell.id='preview-annotation-panel';shell.hidden=true;shell.setAttribute('aria-label','Preview annotation');
 const reader=node('div','preview-annotation-reader');
 const readerHeading=node('strong','','Layout note'),readerNote=node('p','preview-annotation-note');
 const limitation=node('p','preview-annotation-help','Highlights mark the visible viewport. Shared links open a fresh page; scroll position is not included.');
 const readerActions=node('div','preview-annotation-actions'),edit=button('Edit note'),remove=button('Remove note');
 readerActions.append(edit,remove);reader.append(readerHeading,readerNote,limitation,readerActions);
 const editor=node('form','preview-annotation-editor');editor.hidden=true;
 const heading=node('h3','','Annotate this view');
 const noteLabel=node('label','preview-annotation-note-label','Layout note');
 const note=node('textarea');note.id='preview-annotation-note';note.rows=2;note.maxLength=MAX_ANNOTATION_NOTE_LENGTH;note.placeholder='What should someone look at?';noteLabel.htmlFor=note.id;noteLabel.append(note);
 const help=node('p','preview-annotation-help','Drag over the website to highlight an area, or enter its position below. Notes are included in shared links.');help.id='preview-annotation-help';note.setAttribute('aria-describedby',help.id);
 const details=node('details','preview-annotation-region-settings'),summary=node('summary','','Highlight position');
 const checkLabel=node('label','preview-annotation-check'),regionCheck=node('input');regionCheck.type='checkbox';checkLabel.append(regionCheck,doc.createTextNode('Highlight a region'));
 const coordinates=node('div','preview-annotation-coordinates'),inputs={};
 for(const [key,label]of [['x','Left (%)'],['y','Top (%)'],['width','Width (%)'],['height','Height (%)']]){
  const field=node('label','',label),input=node('input');input.type='number';input.min=['x','y'].includes(key)?'0':'0.1';input.max='100';input.step='any';input.id='annotation-region-'+key;field.htmlFor=input.id;inputs[key]=input;field.append(input);coordinates.append(field);
 }
 details.append(summary,checkLabel,coordinates);
 const error=node('p','preview-annotation-error');error.setAttribute('role','alert');error.hidden=true;
 const editorActions=node('div','preview-annotation-actions'),save=button('Save note','primary'),clear=button('Clear highlight'),cancelButton=button('Cancel');save.type='submit';editorActions.append(save,clear,cancelButton);
 const editorLimitation=limitation.cloneNode(true);editor.append(heading,noteLabel,help,details,error,editorActions,editorLimitation);shell.append(reader,editor);container.prepend(shell);
 const layer=node('div','preview-annotation-layer'),highlight=node('div','preview-annotation-highlight');layer.setAttribute('aria-hidden','true');layer.append(highlight);
 let editing=false,draft=null,drag=null,observedFrame=null,key=contextKey(getState()),destroyed=false;
 const listeners=[];
 const listen=(element,type,handler)=>{element.addEventListener(type,handler);listeners.push(()=>element.removeEventListener(type,handler));};
 const resize=typeof win?.ResizeObserver==='function'?new win.ResizeObserver(()=>positionLayer()):null;
 trigger?.setAttribute('aria-controls',shell.id);trigger?.setAttribute('aria-expanded','false');

 function positionLayer(){
  const frame=getFrame();
  if(frame!==observedFrame){resize?.disconnect();observedFrame=frame;if(frame)resize?.observe(frame);}
  if(!frame?.parentElement||(!editing&&!normalizeAnnotation(getState().annotation))||getState().view!=='single'||getState().content!=='website'){
   layer.remove();return;
  }
  if(layer.parentElement!==frame.parentElement)frame.parentElement.append(layer);
  Object.assign(layer.style,{left:frame.offsetLeft+'px',top:frame.offsetTop+'px',width:frame.offsetWidth+'px',height:frame.offsetHeight+'px'});
 }
 function paint(){
  const annotation=editing?draft:normalizeAnnotation(getState().annotation),rect=annotation?.rect;
  layer.classList.toggle('is-editing',editing);highlight.hidden=!rect;
  if(rect)Object.assign(highlight.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.width*100+'%',height:rect.height*100+'%'});
  positionLayer();
 }
 function syncInputs(){
  regionCheck.checked=Boolean(draft?.rect);clear.disabled=!draft?.rect;
  for(const name of fields){inputs[name].disabled=!draft?.rect;inputs[name].value=String(round((draft?.rect?.[name]??(['width','height'].includes(name)?0.5:0.25))*100));inputs[name].removeAttribute('aria-invalid');}
 }
 function clearError(){error.textContent='';error.hidden=true;}
 function showError(message){error.textContent=message;error.hidden=false;}
 function endDrag(){
  if(drag&&layer.hasPointerCapture?.(drag.id))layer.releasePointerCapture(drag.id);
  drag=null;
 }
 function cancel({focus=true}={}){
  endDrag();editing=false;draft=null;clearError();update();if(focus)returnFocus?.focus();
 }
 function update(){
  if(destroyed)return;
  const state=getState(),nextKey=contextKey(state);
  if(editing&&(nextKey!==key||state.view!=='single')){endDrag();editing=false;draft=null;clearError();}
  key=nextKey;
  const annotation=normalizeAnnotation(state.annotation),visible=state.view==='single'&&state.content==='website';
  shell.hidden=!visible||(!editing&&!annotation);editor.hidden=!editing;reader.hidden=editing;
  trigger?.setAttribute('aria-expanded',String(editing));
  readerNote.textContent=annotation?.note||'See the highlighted area.';
  paint();
 }
 function start(){
  onRequestPreview();
  const state=getState();key=contextKey(state);
  draft=normalizeAnnotation(state.annotation)||{note:'',rect:null};editing=true;
  note.value=draft.note;clearError();syncInputs();update();note.focus({preventScroll:true});shell.scrollIntoView({block:'nearest'});
 }
 function readRegion(){
  if(!regionCheck.checked)return null;
  const rect=Object.fromEntries(fields.map(name=>[name,inputs[name].value.trim()===''?NaN:Number(inputs[name].value)/100]));
  const normalized=normalizeAnnotation({note:'',rect});
  if(!normalized){for(const input of Object.values(inputs))input.setAttribute('aria-invalid','true');throw new Error('Keep the highlight inside the viewport. Left + width and top + height must each be 100% or less.');}
  return normalized.rect;
 }
 listen(trigger??edit,'click',start);if(trigger)listen(edit,'click',start);
 listen(remove,'click',()=>{onChange(null);update();returnFocus?.focus();});
 listen(cancelButton,'click',()=>cancel());
 listen(editor,'keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();cancel();}});
 listen(editor,'submit',event=>{
  event.preventDefault();clearError();
  try{
   const annotation=validateAnnotation({note:note.value,rect:readRegion()});endDrag();editing=false;draft=null;onChange(annotation);update();returnFocus?.focus();
  }catch(reason){showError(reason.message);}
 });
 listen(note,'input',()=>{if(draft)draft.note=note.value;clearError();});
 listen(clear,'click',()=>{draft.rect=null;clearError();syncInputs();paint();});
 listen(regionCheck,'change',()=>{draft.rect=regionCheck.checked?{x:.25,y:.25,width:.5,height:.5}:null;clearError();syncInputs();paint();});
 for(const input of Object.values(inputs))listen(input,'input',()=>{
  clearError();try{draft.rect=readRegion();for(const element of Object.values(inputs))element.removeAttribute('aria-invalid');paint();}catch(reason){showError(reason.message);}
 });
 listen(layer,'pointerdown',event=>{
  if(!editing||event.button!==0||drag)return;
  event.preventDefault();drag={id:event.pointerId,start:{x:event.clientX,y:event.clientY},before:draft.rect};layer.setPointerCapture?.(event.pointerId);
 });
 function move(event){
  if(!drag||event.pointerId!==drag.id)return;
  event.preventDefault();const bounds=getFrame()?.getBoundingClientRect();
  const rect=annotationRegionFromPoints(drag.start,{x:event.clientX,y:event.clientY},bounds);
  if(rect){draft.rect=rect;clearError();syncInputs();paint();}
 }
 listen(layer,'pointermove',move);
 listen(layer,'pointerup',event=>{if(!drag||event.pointerId!==drag.id)return;move(event);endDrag();});
 listen(layer,'pointercancel',event=>{if(!drag||event.pointerId!==drag.id)return;draft.rect=drag.before;endDrag();syncInputs();paint();});
 listen(layer,'lostpointercapture',()=>{drag=null;});
 if(win)listen(win,'resize',positionLayer);
 update();
 return {update,cancel,destroy(){destroyed=true;endDrag();resize?.disconnect();for(const removeListener of listeners)removeListener();layer.remove();shell.remove();trigger?.removeAttribute('aria-controls');trigger?.removeAttribute('aria-expanded');}};
}

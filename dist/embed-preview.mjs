import {readPreviewLink} from './share-preview.mjs';
import {validateSnapshotUrl} from './snapshot.mjs';

export const EMBED_HEIGHTS=Object.freeze({min:320,max:1200,default:640});
const sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function createEmbedUrl(previewUrl){
 const url=new URL(previewUrl),base=new URL(url);
 base.hash='';
 // Reuse the public URL boundary from sharing. Never export local addresses,
 // credentials, or a private access parameter in the app URL itself.
 validateSnapshotUrl(base.href);
 base.search='';
 if(!readPreviewLink(url.hash,{base:base.href,demoUrl:new URL('demo.html',base).href}))throw new Error('Create a preview link before embedding this view.');
 url.search='';url.searchParams.set('embed','1');
 return url.href;
}

export function createEmbedCode(previewUrl,{height=EMBED_HEIGHTS.default,title='Interactive Duo View preview'}={}){
 if(!Number.isInteger(height)||height<EMBED_HEIGHTS.min||height>EMBED_HEIGHTS.max)throw new Error(`Choose an embed height from ${EMBED_HEIGHTS.min} to ${EMBED_HEIGHTS.max} pixels.`);
 const url=createEmbedUrl(previewUrl);
 return `<iframe\n  src="${escape(url)}"\n  title="${escape(title)}"\n  width="100%"\n  height="${height}"\n  style="display:block; width:100%; border:0; border-radius:12px;"\n  loading="lazy"\n  sandbox="${sandbox}"\n  allow="fullscreen"\n  referrerpolicy="no-referrer"\n></iframe>`;
}

export function bindPreviewEmbedding({getPreview,onEvent=()=>{},document:doc=globalThis.document}){
 const trigger=doc.querySelector('#embed-preview');
 if(!trigger)return {destroy(){}};
 const node=(tag,className,text)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
 const button=(text,className='')=>{const element=node('button',className,text);element.type='button';return element;};
 const dialog=node('dialog','embed-preview-dialog');dialog.id='embed-preview-dialog';
 dialog.setAttribute('aria-labelledby','embed-preview-title');dialog.setAttribute('aria-describedby','embed-preview-summary');
 const heading=node('div','embed-preview-heading'),title=node('h2','','Embed this view');title.id='embed-preview-title';
 const close=button('×','embed-preview-close');close.setAttribute('aria-label','Close embed options');heading.append(title,close);
 const summary=node('p','embed-preview-summary');summary.id='embed-preview-summary';
 const options=node('div','embed-preview-options'),heightLabel=node('label','','Height');
 const height=node('select');height.id='embed-preview-height';heightLabel.htmlFor=height.id;
 for(const [value,label]of [[480,'Compact · 480 px'],[640,'Standard · 640 px'],[800,'Tall · 800 px']]){const option=node('option','',label);option.value=String(value);height.append(option);}
 height.value=String(EMBED_HEIGHTS.default);heightLabel.append(height);
 const widthNote=node('span','','Width adapts to your page.');options.append(heightLabel,widthNote);
 const codeLabel=node('label','embed-preview-code-label','Embed code');
 const code=node('textarea');code.id='embed-preview-code';code.readOnly=true;code.rows=8;code.spellcheck=false;code.setAttribute('autocomplete','off');codeLabel.htmlFor=code.id;codeLabel.append(code);
 const actions=node('div','embed-preview-actions'),copy=button('Copy code','primary'),preview=button('Preview embed','embed-preview-secondary');actions.append(copy,preview);
 const note=node('p','embed-preview-note','Paste this code into an HTML block on your website. Visitors can fold and rotate the preview, or open the full view. Each visit loads a fresh preview.');
 const feedback=node('p','embed-preview-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const demo=node('div','embed-preview-demo');demo.hidden=true;
 dialog.append(heading,summary,options,codeLabel,actions,note,feedback,demo);doc.body.append(dialog);
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',dialog.id);
 let current=null,generation=0,destroyed=false;
 const listeners=[];
 const listen=(element,type,handler)=>{element.addEventListener(type,handler);listeners.push(()=>element.removeEventListener(type,handler));};
 function clearDemo(){demo.replaceChildren();demo.hidden=true;preview.textContent='Preview embed';}
 function refresh(){
  generation++;clearDemo();copy.textContent='Copy code';feedback.textContent='';
  try{code.value=createEmbedCode(current.url,{height:Number(height.value)});copy.disabled=false;preview.disabled=false;codeLabel.hidden=false;options.hidden=false;}
  catch(reason){code.value='';codeLabel.hidden=true;options.hidden=true;copy.disabled=true;preview.disabled=true;feedback.textContent=reason.message;}
 }
 listen(trigger,'click',()=>{
  generation++;clearDemo();feedback.textContent='';
  try{current=getPreview();summary.textContent=current.summary;refresh();}
  catch(reason){current=null;code.value='';codeLabel.hidden=true;options.hidden=true;copy.disabled=true;preview.disabled=true;summary.textContent='Choose a public website or an example to embed.';feedback.textContent=reason.message;}
  if(!dialog.open)dialog.showModal();onEvent('duo_embed_opened');
 });
 listen(close,'click',()=>dialog.close());
 listen(dialog,'close',()=>{generation++;clearDemo();doc.querySelector('#share-preview')?.focus();});
 listen(dialog,'click',event=>{
  if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
 listen(height,'change',refresh);
 listen(code,'click',()=>code.select());
 listen(copy,'click',async()=>{
  if(!code.value)return;
  const value=code.value,version=generation;copy.disabled=true;
  try{
   await doc.defaultView.navigator.clipboard.writeText(value);
   if(!destroyed&&dialog.open&&version===generation){copy.textContent='Copied';feedback.textContent='Embed code copied. Paste it into your website’s HTML.';}
   onEvent('duo_embed_copied',{success:true});
  }catch{
   if(!destroyed&&dialog.open&&version===generation){code.focus();code.select();feedback.textContent='Copy the selected code using your browser’s Copy command.';}
   onEvent('duo_embed_copied',{success:false});
  }finally{if(!destroyed&&version===generation)copy.disabled=!code.value;}
 });
 listen(preview,'click',()=>{
  if(!demo.hidden){clearDemo();return;}
  if(!current)return;
  const frame=node('iframe');frame.title='Your embedded Duo View preview';frame.src=createEmbedUrl(current.url);
  frame.height=height.value;frame.setAttribute('sandbox',sandbox);frame.setAttribute('allow','fullscreen');frame.referrerPolicy='no-referrer';
  demo.replaceChildren(frame);demo.hidden=false;preview.textContent='Hide preview';onEvent('duo_embed_previewed');
 });
 return {destroy(){destroyed=true;generation++;clearDemo();for(const remove of listeners)remove();dialog.remove();trigger.removeAttribute('aria-controls');}};
}

// This is only application chrome: the existing viewer and shared-state parser
// remain responsible for rendering every 3D, 2D, and comparison preview.
export function initEmbeddedPreview({getPreview,getState,onConfigure,onEvent=()=>{},document:doc=globalThis.document}){
 const url=new URL(doc.defaultView.location.href);
 if(url.searchParams.get('embed')!=='1')return {active:false,update(){},destroy(){}};
 const header=doc.createElement('header');header.className='embedded-preview-header';header.setAttribute('aria-label','Embedded preview controls');
 const name=doc.createElement('strong');name.className='embedded-preview-brand';name.textContent='duo view';
 const controls=doc.createElement('div');controls.className='embedded-preview-controls';
 const fold=doc.createElement('button'),rotate=doc.createElement('button');fold.type=rotate.type='button';
 rotate.textContent='Rotate';
 const open=doc.createElement('a');open.textContent='Open in Duo View ↗';open.target='_blank';open.rel='noopener noreferrer';open.className='embedded-preview-open';
 const status=doc.createElement('span');status.className='embedded-preview-state';status.setAttribute('role','status');
 controls.append(fold,rotate);header.append(name,status,controls,open);doc.body.prepend(header);doc.body.classList.add('is-embedded-preview');
 let destroyed=false,lastAngle=100,lastPose='tabletop';
 function update(){
  if(destroyed)return;
  const state=getState(),folded=state.display==='folded';
  if(!folded){lastAngle=state.foldAngle;lastPose=state.pose;}
  fold.textContent=folded?'Unfold':'Fold';fold.setAttribute('aria-label',folded?'Unfold device':'Fold device');
  rotate.setAttribute('aria-label',`Rotate to ${state.orientation==='portrait'?'landscape':'portrait'}`);
  // All-poses comparison shows both folds already. Phone comparison still
  // responds to the fold state, so its controls stay available.
  fold.disabled=state.view==='compare'&&state.comparison!=='phone';
  fold.title=fold.disabled?'This comparison already shows folded and open layouts.':'';
  status.textContent=`${folded?'Folded':'Open'} · ${state.orientation==='landscape'?'Landscape':'Portrait'}`;
  try{const link=new URL(createEmbedUrl(getPreview().url));link.search='';open.href=link.href;open.removeAttribute('aria-disabled');}
  catch{open.removeAttribute('href');open.setAttribute('aria-disabled','true');}
 }
 const toggle=()=>{
  const folded=getState().display==='folded';
  onConfigure({display:folded?'open':'folded',foldAngle:folded?lastAngle:0,pose:folded?lastPose:'flat'});update();
  onEvent('duo_embed_configured',{control:'display',display:folded?'open':'folded'});
 };
 const turn=()=>{const orientation=getState().orientation==='portrait'?'landscape':'portrait';onConfigure({orientation});update();onEvent('duo_embed_configured',{control:'orientation',orientation});};
 // Camera gestures happen inside the viewer; resolve their latest state when
 // a visitor follows or copies the full-view link.
 open.addEventListener('pointerdown',update);open.addEventListener('focus',update);open.addEventListener('click',update);
 fold.addEventListener('click',toggle);rotate.addEventListener('click',turn);update();
 return {active:true,update,destroy(){destroyed=true;fold.removeEventListener('click',toggle);rotate.removeEventListener('click',turn);open.removeEventListener('pointerdown',update);open.removeEventListener('focus',update);open.removeEventListener('click',update);header.remove();doc.body.classList.remove('is-embedded-preview');}};
}

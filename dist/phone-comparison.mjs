import {dimensions} from './simulator.mjs';

// Generic reference screens, not measurements of a particular phone model.
export const REFERENCE_PHONES=Object.freeze({
 compact:Object.freeze({label:'Compact phone',width:360,height:800}),
 standard:Object.freeze({label:'Standard phone',width:390,height:844}),
 large:Object.freeze({label:'Large phone',width:430,height:932}),
});

const orientationLabel=orientation=>orientation==='landscape'?'Landscape':'Portrait';
const duoLabel=(display,orientation)=>`${display==='folded'?'Folded':'Open'} · ${orientationLabel(orientation)}`;
const referenceKey=state=>Object.hasOwn(REFERENCE_PHONES,state.reference)?state.reference:'standard';

function referenceSize(reference,orientation,chrome){
 let {width,height}=REFERENCE_PHONES[reference];
 if(orientation==='landscape')[width,height]=[height,width];
 return dimensions('folded',orientation,chrome,{width,height});
}

/** Sizes describe CSS viewports; render both phone-comparison cards at one scale. */
export function comparisonDevices(state={}){
 const chrome=Boolean(state.chrome);
 if(state.comparison!=='phone'){
  return ['folded','open'].flatMap(display=>['portrait','landscape'].map(orientation=>({
   id:`${display}-${orientation}`,label:duoLabel(display,orientation),display,orientation,
   size:dimensions(display,orientation,chrome),reference:false,
  })));
 }
 const display=state.display??'open',orientation=state.orientation??'portrait',reference=referenceKey(state);
 return [
  {
   id:`reference-${reference}`,label:`${REFERENCE_PHONES[reference].label} · ${orientationLabel(orientation)}`,
   display:'folded',orientation,size:referenceSize(reference,orientation,chrome),reference:true,
  },
  {
   id:'selected-duo',label:`Duo · ${duoLabel(display,orientation)}`,display,orientation,
   size:dimensions(display,orientation,chrome,state.custom),reference:false,
  },
 ];
}

let comparisonCount=0;

/** Mount outside the comparison grid so rebuilding device cards preserves focus. */
export function bindPhoneComparison({host,getState,onChange,document:doc=host?.ownerDocument}={}){
 if(!host||!doc||typeof getState!=='function'||typeof onChange!=='function')throw new TypeError('A host, getState, and onChange callback are required.');
 const id=`duo-phone-comparison-${++comparisonCount}`;
 const element=(tag,className,text)=>{
  const node=doc.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const panel=element('div','phone-comparison-controls');
 const row=element('div','phone-comparison-row');
 const modes=element('div','phone-comparison-modes');
 modes.setAttribute('role','group');modes.setAttribute('aria-label','Comparison layout');
 const buttons=['poses','phone'].map(value=>{
  const button=element('button','phone-comparison-mode',value==='poses'?'All Duo views':'Phone vs Duo');
  button.type='button';button.dataset.comparison=value;
  const click=()=>{onChange({comparison:value});update();};
  button.addEventListener('click',click);modes.append(button);
  return {button,value,click};
 });
 const referenceLabel=element('label','phone-comparison-reference');
 referenceLabel.htmlFor=`${id}-reference`;
 const select=element('select');select.id=`${id}-reference`;
 const options=Object.entries(REFERENCE_PHONES).map(([value,phone])=>{
  const option=element('option');option.value=value;select.append(option);
  return {option,value,phone};
 });
 referenceLabel.append(element('span','', 'Phone size'),select);
 const note=element('p','phone-comparison-note');note.id=`${id}-note`;
 select.setAttribute('aria-describedby',note.id);
 const change=()=>{
  if(Object.hasOwn(REFERENCE_PHONES,select.value)){onChange({reference:select.value});update();}
 };
 select.addEventListener('change',change);
 row.append(modes,referenceLabel);panel.append(row,note);host.append(panel);
 const originalHidden=host.hidden;
 let destroyed=false;
 function update(){
  if(destroyed)return;
  const state=getState(),phoneMode=state.comparison==='phone';
  host.hidden=state.view!=='compare';
  for(const {button,value}of buttons){
   const active=value===(phoneMode?'phone':'poses');
   button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);
  }
  referenceLabel.hidden=!phoneMode;select.disabled=!phoneMode;
  for(const {option,value,phone}of options){
   const size=referenceSize(value,state.orientation??'portrait',false);
   option.textContent=`${phone.label.replace(' phone','')} · ${size.width} × ${size.height}`;
  }
  select.value=referenceKey(state);
  note.textContent=phoneMode?
   'Reference sizes are illustrative CSS pixels. Both previews load the same URL; scrolling and navigation are independent.':
   'Compare the four Duo layouts. Each preview loads the same URL; scrolling and navigation are independent.';
 }
 update();
 return {update,destroy(){
  destroyed=true;
  for(const {button,click}of buttons)button.removeEventListener('click',click);
  select.removeEventListener('change',change);panel.remove();host.hidden=originalHidden;
 }};
}

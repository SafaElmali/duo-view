export function bindPreviewModePicker(select) {
 const trigger=document.getElementById('preview-mode-trigger');
 const menu=document.getElementById('preview-mode-menu');
 const options=[...menu.querySelectorAll('[data-preview-mode]')];
 if(!menu.showPopover)return {sync(){}};
 const isOpen=()=>menu.matches(':popover-open');
 function sync(){
  trigger.querySelector('.mode-trigger-label').textContent=select.selectedOptions[0].textContent;
  options.forEach(option=>option.setAttribute('aria-checked',String(option.dataset.previewMode===select.value)));
 }
 function position(){
  const rect=trigger.getBoundingClientRect(),width=Math.min(332,innerWidth-24);
  menu.style.width=`${width}px`;
  menu.style.left=`${Math.max(12,Math.min(innerWidth-width-12,rect.right-width))}px`;
  const height=menu.offsetHeight||215;
  menu.style.top=`${rect.bottom+height+20>innerHeight?Math.max(12,rect.top-height-8):rect.bottom+8}px`;
 }
 function close(){if(isOpen())menu.hidePopover();}
 trigger.hidden=false;select.hidden=true;sync();
 menu.addEventListener('beforetoggle',event=>{if(event.newState==='open')position();});
 menu.addEventListener('toggle',()=>{
  trigger.setAttribute('aria-expanded',String(isOpen()));
  if(isOpen()){position();options.find(option=>option.dataset.previewMode===select.value)?.focus({preventScroll:true});}
 });
 trigger.addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp'].includes(event.key))return;
  event.preventDefault();if(!isOpen())menu.showPopover();
 });
 menu.addEventListener('keydown',event=>{
  const current=options.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();
   const next=event.key==='Home'?0:event.key==='End'?options.length-1:(current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
   options[next].focus();
  }else if(event.key==='Escape'){
   event.preventDefault();close();trigger.focus({preventScroll:true});
  }else if(event.key==='Tab'){
   close();trigger.focus({preventScroll:true});
  }
 });
 options.forEach(option=>option.addEventListener('click',()=>{
  select.value=option.dataset.previewMode;
  select.dispatchEvent(new Event('change',{bubbles:true}));
  sync();close();trigger.focus({preventScroll:true});
 }));
 window.addEventListener('resize',()=>{if(isOpen())position();});
 window.addEventListener('scroll',event=>{if(!menu.contains(event.target))close();},true);
 return {sync};
}

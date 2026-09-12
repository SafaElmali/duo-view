// Reuse the same controls on desktop and mobile so selections never diverge.
export function bindMobileControls(){
 const sidebar=document.querySelector('.sidebar');
 const home=sidebar.parentElement,next=sidebar.nextElementSibling;
 const dialog=document.querySelector('#mobile-controls-dialog');
 const trigger=document.querySelector('#mobile-settings');
 const media=matchMedia('(max-width: 900px)');
 function sync(){
  if(dialog.open)dialog.close();
  if(media.matches)dialog.append(sidebar);else home.insertBefore(sidebar,next);
 }
 trigger.addEventListener('click',()=>{if(media.matches){dialog.showModal();trigger.setAttribute('aria-expanded','true');}});
 document.querySelector('#close-mobile-settings').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
 media.addEventListener('change',sync);sync();
}

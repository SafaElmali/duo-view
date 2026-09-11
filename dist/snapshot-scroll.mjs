// All three surfaces show the same full viewport, cropped by the device geometry.
// Share native scroll offsets so the two halves remain one continuous page.
export function createSnapshotScroller(frames){
 let key=null,image=null,top=0,max=0;
 const bindings=new Map();
 function align(){
  for(const view of bindings.values()){
   if(Math.abs(view.scrollY-top)>.5)view.scrollTo(0,top);
  }
 }
 function scroll(event){
  const next=Math.max(0,Math.min(max,event.currentTarget.scrollY));
  top=next;align();
 }
 function detach(frame){
  bindings.get(frame)?.removeEventListener('scroll',scroll);
  bindings.delete(frame);
 }
 function attach(frame){
  detach(frame);
  // Only our script-free srcdoc is accessible; never inspect a live website.
  if(!image||!frame.hasAttribute('srcdoc'))return;
  const doc=frame.contentDocument;
  if(doc?.body?.dataset.snapshotImage!==image)return;
  const view=frame.contentWindow;
  bindings.set(frame,view);
  view.addEventListener('scroll',scroll,{passive:true});
  align();
 }
 const loaders=frames.map(frame=>{
  const listener=()=>attach(frame);
  frame.addEventListener('load',listener);
  return listener;
 });
 return {
  update(capture){
   const nextKey=capture?.key??null;
   if(nextKey!==key)top=0;
   key=nextKey;image=capture?.image??null;
   max=image?Math.max(0,capture.height-capture.contentHeight):0;
   top=Math.min(top,max);
   for(const frame of frames)attach(frame);
  },
  getState:()=>({top,max}),
  dispose(){
   frames.forEach((frame,index)=>{detach(frame);frame.removeEventListener('load',loaders[index]);});
  }
 };
}

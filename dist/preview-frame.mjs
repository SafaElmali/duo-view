function showLoading(frame,loading,url){
 const parent=frame.parentElement;if(!parent)return;
 let message=parent.querySelector(':scope > .preview-frame-loading');
 if(!loading){message?.remove();frame.removeAttribute('aria-busy');return;}
 if(!message){
  message=frame.ownerDocument.createElement('div');message.className='preview-frame-loading';message.setAttribute('role','status');
  const label=frame.ownerDocument.createElement('strong'),host=frame.ownerDocument.createElement('span');
  label.textContent='Loading website';message.append(label,host);parent.append(message);
 }
 message.querySelector('span').textContent=new URL(url).hostname;
 frame.setAttribute('aria-busy','true');
}

// A source change gets a new browsing context without replacing the iframe node.
// This drops the previous srcdoc immediately while preserving callers' references.
export function createFrameNavigator({setLoading=showLoading,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=15000}={}){
 const navigations=new WeakMap();
 return function navigate(frame,{url='about:blank',html=null,onTimeout=()=>{},force=false}){
  const previous=navigations.get(frame);
  if(!force&&previous?.url===url&&previous.html===html)return;
  if(previous){clearTimer(previous.timer);frame.removeEventListener('load',previous.loaded);}
  setLoading(frame,false,url);
  const navigation={url,html,timer:null,loaded:null};navigations.set(frame,navigation);
  const parent=frame.parentNode,next=frame.nextSibling;
  frame.remove();
  if(html!==null){frame.src='about:blank';frame.srcdoc=html;}
  else{frame.removeAttribute('srcdoc');frame.src=url;}
  const live=html===null&&url!=='about:blank';
  navigation.loaded=()=>{
   if(navigations.get(frame)!==navigation)return;
   // An initial blank document isn't the requested page. Cross-origin documents
   // aren't inspected; a load event only ends the loading indicator, not proof of success.
   if(live&&frame.contentDocument?.URL==='about:blank')return;
   clearTimer(navigation.timer);navigation.timer=null;setLoading(frame,false,url);
  };
  frame.addEventListener('load',navigation.loaded);
  if(parent)parent.insertBefore(frame,next);
  if(live){
   setLoading(frame,true,url);
   navigation.timer=setTimer(()=>{
    if(navigations.get(frame)!==navigation)return;
    navigation.timer=null;onTimeout(url);
   },timeoutMs);
  }
 };
}

export const navigatePreviewFrame=createFrameNavigator();

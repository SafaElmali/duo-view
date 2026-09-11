import {normalizeUrl,validDimension} from './simulator.mjs';
const params=new URLSearchParams(location.hash.slice(1));
const title=document.querySelector('#title'),message=document.querySelector('#message'),link=document.querySelector('#continue');
try{
  const target=normalizeUrl(params.get('url')||'',location.href,{embedded:false});
  const width=Number(params.get('width')),height=Number(params.get('height'));
  if(!validDimension(width)||!Number.isInteger(height)||height<138||height>1600)throw new Error('The requested viewport size is invalid.');
  window.opener=null;
  const ticks=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const matches=()=>Math.abs(innerWidth-width)<=1&&Math.abs(innerHeight-height)<=1;
  // Request correction while still on our own launch page, before navigating to the target.
  if(!matches()){
    try{resizeTo(width+Math.max(0,outerWidth-innerWidth),height+Math.max(0,outerHeight-innerHeight));}catch{}
    await ticks();
  }
  const result={type:'duoview:launch',id:params.get('id'),width:innerWidth,height:innerHeight,matched:matches()};
  try{const channel=new BroadcastChannel('duo-view-launch');channel.postMessage(result);setTimeout(()=>channel.close(),1000);}catch{}
  link.href=target;
  if(result.matched){location.replace(target);}
  else{
    title.textContent='This browser didn’t apply the requested size.';
    message.textContent=`Requested ${width} × ${height} px; this window is ${innerWidth} × ${innerHeight} px. Use Duo View in desktop Chrome, Edge, or Safari for a separate, resizable window. You can still open the website normally below.`;
    link.hidden=false;
  }
}catch(error){title.textContent='The preview could not open.';message.textContent=error.message;}

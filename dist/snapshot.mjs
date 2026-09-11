import {validDimension} from './simulator.mjs';

// Microlink runs this in its capture browser, before taking the full-page image.
// Offscreen rendering optimizations must not leave holes in that static image.
export function prepareSnapshotPage(){
 for(const element of document.querySelectorAll('*')){
  if(getComputedStyle(element).contentVisibility==='auto')element.style.setProperty('content-visibility','visible','important');
 }
 for(const image of document.images){
  if(image.loading==='lazy'&&image.getClientRects().length&&getComputedStyle(image).visibility!=='hidden')image.loading='eager';
 }
}

export function validateSnapshotUrl(raw){
 const url=new URL(raw),host=url.hostname.toLowerCase();
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use a public website URL without login credentials.');
 // A public screenshot provider cannot reach local development or private pages.
 if(!host.includes('.')||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.startsWith('[')||/^\d+(\.\d+){3}$/.test(host))throw new Error('Snapshots need a public domain. Use Live preview for local or private websites.');
 if([...url.searchParams.keys()].some(key=>/token|secret|password|authorization|api.?key|session|signature/i.test(key)))throw new Error('This URL contains a private access parameter. Use Live preview instead.');
 if(url.hash)throw new Error('Remove the # fragment before creating a public snapshot.');
 return url.href;
}
export function screenshotRequest(raw,size){
 const url=validateSnapshotUrl(raw);
 if(!validDimension(size.width)||!Number.isInteger(size.contentHeight)||size.contentHeight<138||size.contentHeight>1600)throw new Error('Choose valid preview dimensions.');
 const request=new URL('https://api.microlink.io/');
 request.search=new URLSearchParams({url,'screenshot.fullPage':'true',meta:'false','viewport.width':String(size.width),'viewport.height':String(size.contentHeight),'viewport.deviceScaleFactor':'1',scripts:`(${prepareSnapshotPage.toString()})()`,'waitForTimeout':'3000'});
 return request.href;
}
export async function captureSnapshot(raw,size,signal){
 const response=await fetch(screenshotRequest(raw,size),{signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(response.status===429)throw new Error('The snapshot service has reached its limit. Try later, or use Live preview.');
 if(!response.ok)throw new Error('The snapshot service could not capture this page. Try again or use Live preview.');
 const result=await response.json(),shot=result.data?.screenshot;
 if(result.status!=='success'||!shot?.url)throw new Error('This page could not be captured. It may require sign-in or block automated browsers.');
 const image=new URL(shot.url);
 if(image.protocol!=='https:'||image.username||image.password)throw new Error('The snapshot service returned an invalid image.');
 if(shot.width!==size.width||!Number.isSafeInteger(shot.height)||shot.height<size.contentHeight)throw new Error('The capture did not match the requested dimensions. Try again.');
 const preview=new Image();preview.referrerPolicy='no-referrer';
 await new Promise((resolve,reject)=>{
  const cleanup=()=>signal?.removeEventListener('abort',abort);
  const abort=()=>{cleanup();preview.src='';reject(new DOMException('Capture cancelled','AbortError'));};
  preview.onload=()=>{cleanup();if(preview.naturalWidth!==shot.width||preview.naturalHeight!==shot.height)reject(new Error('The image did not match the requested dimensions.'));else resolve();};
  preview.onerror=()=>{cleanup();reject(new Error('The captured image could not load. Try again.'));};
  if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});preview.src=image.href;
 });
 return {image:image.href,width:shot.width,height:shot.height};
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function snapshotDocument(capture){
 const body=capture?.image?`<img alt="Scrollable website snapshot. Links are not interactive." src="${escape(capture.image)}" width="${escape(capture.width)}" height="${escape(capture.height)}" draggable="false">`:`<main><span>DUO VIEW</span><h1>${capture?.error?'Preview unavailable':'Preparing your preview…'}</h1><p>${escape(capture?.error||'Rendering the full page at this display size. This can take a few seconds.')}</p></main>`;
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;background:#f6f8fc;font-family:Arial,sans-serif;color:#253758}html{overflow-x:hidden;overflow-y:auto;scrollbar-width:none;overscroll-behavior:contain;touch-action:pan-y;scroll-behavior:auto}::-webkit-scrollbar{display:none}body:focus-visible{outline:3px solid #3163ed;outline-offset:-3px}img{width:100%;height:auto;display:block;user-select:none;-webkit-user-select:none}main{padding:12% 9%}span{font-size:14px;letter-spacing:3px;color:#8292ac}h1{font-size:30px;line-height:1.2;font-weight:500}p{font-size:18px;line-height:1.6;color:#71819b}</style></head><body tabindex="0" data-snapshot-image="${escape(capture?.image||'')}">${body}</body></html>`;
}

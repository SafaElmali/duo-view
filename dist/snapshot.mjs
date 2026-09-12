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
 const loading=!capture?.image&&!capture?.error;
 const mark=`<svg class="loading-mark" viewBox="0 0 30 30" aria-hidden="true"><path class="fold-left" d="M4 5 14 8v18L4 23Z" fill="currentColor"/><path class="fold-right" d="m16 8 10-3v18l-10 3Z" fill="currentColor"/></svg>`;
 const body=capture?.image?`<img alt="Scrollable website snapshot. Links are not interactive." src="${escape(capture.image)}" width="${escape(capture.width)}" height="${escape(capture.height)}" draggable="false">`:`<main class="${loading?'preparing':'unavailable'}" role="status"><div class="preview-status">${loading?`<div class="loading-emblem">${mark}</div>`:''}<span class="wordmark">DUO VIEW</span><h1>${loading?'Preparing your preview':'Preview unavailable'}</h1><p>${escape(capture?.error||'Capturing your website at this display size.')}</p>${loading?'<div class="loading-track" aria-hidden="true"><div></div></div><small>This may take a few moments.</small>':''}</div></main>`;
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;background:#f6f8fc;font-family:Arial,sans-serif;color:#253758}html{overflow-x:hidden;overflow-y:auto;scrollbar-width:none;overscroll-behavior:contain;touch-action:pan-y;scroll-behavior:auto}::-webkit-scrollbar{display:none}body:focus-visible{outline:3px solid #3163ed;outline-offset:-3px}img{width:100%;height:auto;display:block;user-select:none;-webkit-user-select:none}main{min-height:100svh;display:grid;place-items:center;padding:36px 24px;text-align:center;background:radial-gradient(ellipse at 50% 40%,#fff 0%,#f6f8ff 70%,#eef2fc 100%)}.preview-status{width:100%;max-width:440px}.wordmark{display:block;font-size:12px;font-weight:600;letter-spacing:3px;color:#75839f}h1{font-size:clamp(23px,4.5vw,32px);line-height:1.2;letter-spacing:-.8px;font-weight:600;margin:16px 0 12px}p{font-size:16px;line-height:1.6;color:#687891;margin:0 auto;max-width:330px;overflow-wrap:anywhere}.loading-emblem{width:86px;height:86px;display:grid;place-items:center;margin:0 auto 24px;border:1px solid #dfe7ff;border-radius:24px;background:linear-gradient(145deg,#fff,#edf2ff);box-shadow:0 12px 36px #315ef514,inset 0 1px 0 #fff}.loading-mark{width:54px;height:54px;color:#315ef5;overflow:visible}.fold-left,.fold-right{transform-origin:15px 15px;animation:fold 2.4s ease-in-out infinite}.fold-right{animation-delay:-1.2s;color:#567cfa}.loading-track{width:148px;height:4px;border-radius:9px;background:#e2e9fb;overflow:hidden;margin:28px auto 14px}.loading-track div{width:55%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#96afff,#315ef5);animation:shimmer 1.8s ease-in-out infinite}small{font-size:13px;line-height:1.5;color:#7b88a0}@keyframes fold{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.28);opacity:.55}}@keyframes shimmer{0%{transform:translateX(-110%)}100%{transform:translateX(290%)}}@media(max-height:400px){main{padding:22px}.loading-emblem{width:64px;height:64px;border-radius:18px;margin-bottom:16px}.loading-mark{width:42px;height:42px}.loading-track{margin-top:20px}h1{margin-top:12px}}@media(prefers-reduced-motion:reduce){.fold-left,.fold-right,.loading-track div{animation:none}.loading-track div{width:100%;opacity:.45}}</style></head><body tabindex="0" data-snapshot-image="${escape(capture?.image||'')}">${body}</body></html>`;
}

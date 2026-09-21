import {siteBase} from './routes.mjs';
import {matchExampleUrl} from './example-gallery.mjs';

export const PRESETS = Object.freeze({folded:{width:466,height:678},open:{width:626,height:890}});
export function isBuiltInWebsite(raw,base){
  try{return new URL(raw).href===new URL('demo.html',siteBase(base)).href||Boolean(matchExampleUrl(raw,base));}catch{return false;}
}
export function dimensions(display,orientation,chrome=false,custom=null){
  if(!Object.hasOwn(PRESETS,display)||!['portrait','landscape'].includes(orientation))throw new Error('Invalid device configuration.');
  let {width,height}=PRESETS[display];
  if(orientation==='landscape')[width,height]=[height,width];
  if(custom){if(!validDimension(custom.width)||!validDimension(custom.height))throw new Error('Dimensions must be whole numbers between 240 and 1600.');({width,height}=custom);}
  return {width,height,contentHeight:height-(chrome?102:0),outerWidth:width+26,outerHeight:height+26};
}
export function validDimension(value){return Number.isInteger(value)&&value>=240&&value<=1600;}
export function normalizeUrl(raw,base,{embedded=true}={}){
  const input=raw.trim();if(!input)throw new Error('Enter a website URL, or choose Try demo.');
  const candidate=/^[a-z][a-z0-9+.-]*:/i.test(input)&&!/^localhost:\d/i.test(input)?input:(/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(input)?'http://':'https://')+input;
  let url;try{url=new URL(candidate);}catch{throw new Error('Enter a valid website address.');}
  if(!['http:','https:'].includes(url.protocol))throw new Error('Use an http:// or https:// website URL.');
  if(url.username||url.password)throw new Error('Use a URL without an embedded username or password.');
  if(embedded&&base&&new URL(base).protocol==='https:'&&url.protocol==='http:')throw new Error('Use an HTTPS URL. This hosted preview cannot embed an HTTP page.');
  if(base&&url.origin===new URL(base).origin&&!isBuiltInWebsite(url.href,base))throw new Error('Choose the website you want to test, not Duo View itself.');
  return url.href;
}
export function fitScale(size,availableWidth,availableHeight,zoom='fit'){
  if(zoom!=='fit')return Number(zoom);
  return Math.max(.1,Math.min(1,(availableWidth-8)/size.outerWidth,(availableHeight-8)/size.outerHeight));
}

export function windowPreviewConfig(url,display,orientation,chrome=false,custom=null){
  const size=dimensions(display,orientation,chrome,custom);
  return {url,width:size.width,height:size.contentHeight,features:`popup=yes,width=${size.width},height=${size.contentHeight},resizable=yes,scrollbars=yes`};
}

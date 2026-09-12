import {analyticsConfig} from './analytics-config.mjs';

const categories={
 display:['open','folded'],orientation:['portrait','landscape'],view:['three','single','compare'],
 mode:['embedded','snapshot'],content:['website','player'],pose:['tabletop','book','flat'],
 finish:['white','night'],source:['demo','custom'],reason:['blocked','file-preview','load-timeout'],
 input:['pointer','keyboard'],control:['about','limits','help','browser_chrome','hinge_guide','orientation','display'],
 environment:['production','development'],direction:['back','forward'],zoom:['fit','0.5','0.75','1']
};
const numbers=new Set(['width','height','angle','duration_ms','seconds','rate','brightness']);
const booleans=new Set(['enabled','muted','locked','back','success']);
export function safeProperties(properties={}){
 const result={};
 for(const [key,value] of Object.entries(properties)){
  if(categories[key]?.includes(value)||numbers.has(key)&&typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e8||booleans.has(key)&&typeof value==='boolean')result[key]=value;
 }
 return result;
}
export function analyticsOptions(host){
 return {api_host:host,autocapture:false,capture_pageview:false,capture_pageleave:false,
  capture_dead_clicks:false,capture_heatmaps:false,capture_performance:false,capture_exceptions:false,
  disable_session_recording:true,disable_surveys:true,person_profiles:'never',persistence:'localStorage',
  rageclick:false,save_referrer:false,save_campaign_params:false,
  property_denylist:['$current_url','$pathname','$referrer','$initial_referrer','$initial_current_url','$initial_pathname'],
  before_send:event=>event?.event?.startsWith('duo_')?event:null};
}
// Load the official browser SDK without adding a build step to the static app.
export function loadPostHog(config,options){
 return new Promise((resolve,reject)=>{
  const stub=window.posthog||[];window.posthog=stub;
  stub._i=stub._i||[];stub.people=stub.people||[];stub.__SV=1;
  stub.capture=stub.capture||function(...args){stub.push(['capture',...args]);};
  stub._i.push([config.key,{...options,loaded:resolve},'posthog']);
  const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
  script.src=config.host.replace('.i.posthog.com','-assets.i.posthog.com').replace(/\/$/,'')+'/static/array.js';
  const timer=setTimeout(()=>reject(new Error('Analytics unavailable')),10000);
  const loaded=stub._i.at(-1)[1].loaded;
  stub._i.at(-1)[1].loaded=client=>{clearTimeout(timer);loaded(client);};
  script.onerror=()=>{clearTimeout(timer);reject(new Error('Analytics unavailable'));};
  document.head.append(script);
 });
}
export function createAnalytics(config,{location=globalThis.location,load=loadPostHog,now=Date.now}={}){
 let client=null,started=false,enabled=false,queue=[];
 const local=!location||location.protocol==='file:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const last=new Map();
 function send(name,properties){try{client.capture(name,properties);}catch{/* Analytics cannot interrupt the preview. */}}
 return {
  start(){
   if(started)return;started=true;
   if(!config.key?.startsWith('phc_')||!config.host||local&&!config.enableLocal)return;
   try{const host=new URL(config.host);if(host.protocol!=='https:'||host.username||host.password)return;}catch{return;}
   enabled=true;
   Promise.resolve().then(()=>load(config,analyticsOptions(config.host))).then(sdk=>{client=sdk;for(const event of queue)send(...event);queue=[];},()=>{enabled=false;queue=[];});
  },
  track(name,properties={},interval=0){
   if(!enabled||!/^duo_[a-z_]+$/.test(name))return;
   const time=now();if(interval&&last.has(name)&&time-last.get(name)<interval)return;
   if(interval)last.set(name,time);
   const event=[name,{...safeProperties(properties),environment:local?'development':'production',app:'duo_view'}];
   if(client)send(...event);else if(queue.length<100)queue.push(event);
  }
 };
}
const analytics=createAnalytics(analyticsConfig);
let context=()=>({});
export function track(name,properties={},interval=0){analytics.track(name,{...context(),...properties},interval);}
export function initAnalytics(getContext){context=getContext;analytics.start();track('duo_opened');}

export function bindAnalyticsControls(root,capture=track){
 const clicks=[
  ['#mobile-settings','duo_device_settings_opened'],['#close-mobile-settings','duo_device_settings_closed'],
  ['[data-display]','duo_display_selected'],['[data-orientation]','duo_orientation_selected'],
  ['[data-view]','duo_view_selected'],['[data-pose]','duo_pose_selected'],['[data-finish]','duo_finish_selected'],
  ['#demo,[data-player-demo]','duo_content_selected'],['#reload','duo_preview_reloaded'],
  ['#reset-dimensions','duo_dimensions_reset'],['#fullscreen','duo_expand_clicked'],
  ['.duo-interact','duo_interaction_toggled',el=>({enabled:el.getAttribute('aria-pressed')==='true'})],
  ['.duo-back','duo_front_back_clicked',el=>({back:el.getAttribute('aria-pressed')==='true'})],
  ['.duo-reset','duo_camera_reset'],['.duo-download','duo_model_downloaded'],
  ['#about-button,#limits-button,#help-button','duo_help_opened',el=>({control:el.id.split('-')[0]})],
  ['.player-start,.player-play','duo_player_play_pause_clicked'],
  ['[data-skip]','duo_player_skip_clicked',el=>({direction:Number(el.dataset.skip)<0?'back':'forward'})],
  ['.player-volume','duo_player_mute_clicked'],['.player-speed','duo_player_speed_changed',el=>({rate:parseFloat(el.textContent)})],
  ['.player-expand','duo_player_fullscreen_clicked'],
  ['.player-lock','duo_player_lock_changed',el=>({locked:el.getAttribute('aria-pressed')==='true'})],
  ['.player-credit','duo_player_credit_clicked']
 ];
 root.addEventListener('click',event=>{
  for(const [selector,name,properties]of clicks){const el=event.target.closest?.(selector);if(el&&!el.disabled){capture(name,properties?.(el));break;}}
 });
 root.addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('#preview-mode'))capture('duo_preview_mode_selected');
  if(el.matches('#chrome-toggle,#hinge-toggle'))capture('duo_preview_option_changed',{control:el.id==='chrome-toggle'?'browser_chrome':'hinge_guide',enabled:el.checked});
  if(el.matches('#fold-angle'))capture('duo_hinge_changed',{angle:Number(el.value)});
  if(el.matches('#zoom'))capture('duo_zoom_selected',{zoom:el.value});
  if(el.matches('#viewport-width,#viewport-height'))capture('duo_dimensions_changed');
  if(el.matches('.player-progress input'))capture('duo_player_seeked',{seconds:Number(el.value)});
 });
}

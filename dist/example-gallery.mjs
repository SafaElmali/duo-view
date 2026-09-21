import {siteBase} from './routes.mjs';
export const EXAMPLES = Object.freeze([
 Object.freeze({id:'storefront',path:'./examples/storefront.html',title:'Quiet Objects',category:'Storefront',description:'A considered collection of everyday objects. Watch the product grid adapt.'}),
 Object.freeze({id:'newsletter',path:'./examples/newsletter.html',title:'The Margin',category:'Newsletter',description:'A weekly letter for curious people, with stories that find their own rhythm.'}),
 Object.freeze({id:'dashboard',path:'./examples/dashboard.html',title:'Daylight',category:'Dashboard',description:'A calm project overview with a responsive sidebar, charts, and activity.'}),
 Object.freeze({id:'portfolio',path:'./examples/portfolio.html',title:'Alex Morgan',category:'Portfolio',description:'An independent designer’s selected work, from a bold introduction to project details.'}),
]);

/** Resolve a known ID relative to the viewer document, never an arbitrary path. */
export function resolveExampleUrl(id,baseUrl){
 const example=EXAMPLES.find(item=>item.id===id);
 if(!example)return null;
 try{
  const base=new URL(baseUrl);
  if(!['https:','http:','file:'].includes(base.protocol)||base.username||base.password)return null;
  return new URL(example.path,siteBase(base.href)).href;
 }catch{return null;}
}

/** Only the exact bundled pages qualify for the first-party preview exception. */
export function matchExampleUrl(value,baseUrl){
 if(typeof value!=='string'||!value)return null;
 try{
  const url=new URL(value,baseUrl);
  if(url.username||url.password||url.search||url.hash)return null;
  return EXAMPLES.find(example=>resolveExampleUrl(example.id,baseUrl)===url.href)||null;
 }catch{return null;}
}

// These miniature compositions illustrate the examples; they are not page captures.
const THUMBNAILS={
 storefront:'<rect width="400" height="220" fill="#f2eee7"/><path d="M22 35H378" stroke="#c8c1b8"/><text x="22" y="23" fill="#383c31" font-family="Georgia,serif" font-size="14">quiet objects.</text><text x="22" y="67" fill="#727268" font-family="sans-serif" font-size="7" letter-spacing="2">FEWER, BETTER THINGS</text><text x="22" y="96" fill="#383c31" font-family="Georgia,serif" font-size="27">A little more</text><text x="22" y="124" fill="#383c31" font-family="Georgia,serif" font-size="27" font-style="italic">room to live.</text><rect x="22" y="143" width="85" height="23" rx="3" fill="#3f4938"/><text x="34" y="158" fill="#fff" font-family="sans-serif" font-size="8">Explore the collection</text><rect x="225" y="51" width="153" height="147" rx="70" fill="#dcd3c3"/><ellipse cx="301" cy="179" rx="52" ry="9" fill="#b3a999"/><path d="M276 91Q265 128 267 147Q269 171 301 171Q333 171 335 147Q337 128 326 91Z" fill="#ae7455"/><ellipse cx="301" cy="91" rx="25" ry="7" fill="#80553f"/><path d="M275 103Q273 133 275 144" stroke="#d6a78b" stroke-width="5" stroke-linecap="round"/>',
 newsletter:'<rect width="400" height="220" fill="#fbf7ed"/><text x="20" y="25" fill="#ae3e28" font-family="Georgia,serif" font-size="17" font-style="italic">The Margin</text><path d="M20 39H380" stroke="#c9c0ae"/><text x="20" y="63" fill="#9a4d39" font-family="sans-serif" font-size="7" letter-spacing="1.7">A LETTER FOR THE CURIOUS · NO. 042</text><text x="20" y="93" fill="#342d23" font-family="Georgia,serif" font-size="28">There is a whole world</text><text x="20" y="121" fill="#342d23" font-family="Georgia,serif" font-size="28">between the lines.</text><rect x="20" y="145" width="176" height="55" fill="#dd9a71"/><path d="M20 200L72 160 109 187 152 150 196 200" fill="#81584b"/><circle cx="163" cy="158" r="8" fill="#f7d399"/><text x="213" y="156" fill="#8c6e53" font-family="sans-serif" font-size="7">THIS WEEK’S LETTER</text><text x="213" y="174" fill="#342d23" font-family="Georgia,serif" font-size="15">The art of paying attention</text><path d="M213 184H367M213 191H338M213 198H354" stroke="#d2c6b5" stroke-width="3"/>',
 dashboard:'<rect width="400" height="220" fill="#f4f6f8"/><rect width="76" height="220" fill="#fff"/><text x="12" y="27" fill="#24474c" font-family="sans-serif" font-size="12" font-weight="700">◒ daylight</text><rect x="8" y="50" width="60" height="21" rx="4" fill="#e4efeb"/><path d="M17 60H52" stroke="#567d71" stroke-width="4"/><path d="M17 86H56M17 111H50M17 136H54" stroke="#c0c9cc" stroke-width="4"/><text x="96" y="31" fill="#273b40" font-family="sans-serif" font-size="16" font-weight="600">A little progress, every day.</text><rect x="96" y="49" width="89" height="50" rx="5" fill="#fff"/><rect x="194" y="49" width="89" height="50" rx="5" fill="#fff"/><rect x="292" y="49" width="89" height="50" rx="5" fill="#fff"/><text x="107" y="66" fill="#77878c" font-family="sans-serif" font-size="7">COMPLETED</text><text x="205" y="66" fill="#77878c" font-family="sans-serif" font-size="7">FOCUS TIME</text><text x="303" y="66" fill="#77878c" font-family="sans-serif" font-size="7">ON TRACK</text><text x="107" y="88" fill="#2f4847" font-family="sans-serif" font-size="20">24</text><text x="205" y="88" fill="#2f4847" font-family="sans-serif" font-size="20">32h</text><text x="303" y="88" fill="#2f4847" font-family="sans-serif" font-size="20">94%</text><rect x="96" y="110" width="285" height="94" rx="5" fill="#fff"/><path d="M110 183H367M110 160H367M110 137H367" stroke="#edf0f0"/><path d="M111 181L151 175 191 158 231 164 271 145 311 150 366 125" fill="none" stroke="#559685" stroke-width="3"/><path d="M111 181L151 175 191 158 231 164 271 145 311 150 366 125V190H111Z" fill="#7aaa951c"/>',
 portfolio:'<rect width="400" height="220" fill="#e9eddd"/><text x="20" y="25" fill="#252c24" font-family="sans-serif" font-size="9" font-weight="700">ALEX MORGAN</text><text x="316" y="25" fill="#536149" font-family="sans-serif" font-size="7">DESIGNER · MAKER</text><path d="M20 40H380" stroke="#bec8b1"/><text x="20" y="91" fill="#283123" font-family="sans-serif" font-size="39" font-weight="600" letter-spacing="-2">Made to matter.</text><text x="21" y="113" fill="#65705a" font-family="sans-serif" font-size="8">Thoughtful digital experiences for a changing world.</text><rect x="20" y="137" width="177" height="71" rx="4" fill="#405d52"/><circle cx="110" cy="193" r="44" fill="#c3dbb6"/><path d="M110 153V208M71 175L149 211M149 175L71 211" stroke="#405d52" stroke-width="4"/><rect x="210" y="137" width="170" height="71" rx="4" fill="#cb9274"/><rect x="259" y="148" width="72" height="60" rx="3" transform="rotate(-12 295 178)" fill="#f8edcd"/><text x="274" y="182" fill="#89573e" font-family="Georgia,serif" font-size="19" transform="rotate(-12 295 178)">good.</text>',
};

let galleryCount=0;

export function bindExampleGallery({trigger,onSelect,document:doc=trigger?.ownerDocument}={}){
 if(!trigger||!doc||typeof onSelect!=='function')throw new TypeError('A trigger and onSelect callback are required.');
 const id=`duo-example-gallery-${++galleryCount}`;
 const element=(tag,className,text)=>{
  const node=doc.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const dialog=element('dialog','example-gallery-dialog');
 dialog.id=id;
 dialog.setAttribute('aria-labelledby',`${id}-title`);
 dialog.setAttribute('aria-describedby',`${id}-intro`);
 const heading=element('div','example-gallery-heading');
 const title=element('h2','', 'Find a fresh perspective.');title.id=`${id}-title`;
 const closeButton=element('button','example-gallery-close','×');
 closeButton.type='button';closeButton.setAttribute('aria-label','Close examples');
 heading.append(title,closeButton);
 const intro=element('p','example-gallery-intro','Pick an example, then fold or rotate the screen to explore how it adapts.');intro.id=`${id}-intro`;
 const grid=element('div','example-gallery-grid');
 EXAMPLES.forEach(example=>{
  const card=element('button','example-gallery-card');card.type='button';card.dataset.exampleId=example.id;
  card.setAttribute('aria-label',`Open ${example.title} ${example.category.toLowerCase()} example`);
  const preview=element('span','example-gallery-thumbnail');preview.setAttribute('aria-hidden','true');
  preview.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" focusable="false">${THUMBNAILS[example.id]}</svg>`;
  const body=element('span','example-gallery-card-body');
  const category=element('span','example-gallery-category',example.category);
  const name=element('strong','example-gallery-name',example.title);
  const description=element('span','example-gallery-description',example.description);
  const action=element('span','example-gallery-action','Explore example ↗');
  body.append(category,name,description,action);card.append(preview,body);grid.append(card);
 });
 dialog.append(heading,intro,grid,element('p','example-gallery-note','Original sample sites made for Duo View. No accounts or signup needed.'));
 doc.body.append(dialog);
 const previous={haspopup:trigger.getAttribute('aria-haspopup'),controls:trigger.getAttribute('aria-controls'),expanded:trigger.getAttribute('aria-expanded')};
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',id);trigger.setAttribute('aria-expanded','false');
 let destroyed=false;
 function open(){
  if(destroyed||dialog.open)return;
  dialog.showModal();trigger.setAttribute('aria-expanded','true');
 }
 function close(){if(dialog.open)dialog.close();}
 function restoreFocus(){trigger.setAttribute('aria-expanded','false');if(!destroyed&&trigger.isConnected)trigger.focus({preventScroll:true});}
 function choose(event){
  const button=event.target.closest?.('[data-example-id]');
  if(!button||!grid.contains(button))return;
  const example=EXAMPLES.find(item=>item.id===button.dataset.exampleId);
  if(!example)return;
  close();onSelect(example);
 }
 function backdrop(event){
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();
 }
 trigger.addEventListener('click',open);closeButton.addEventListener('click',close);dialog.addEventListener('close',restoreFocus);dialog.addEventListener('click',backdrop);grid.addEventListener('click',choose);
 return {open,close,destroy(){
  destroyed=true;close();trigger.removeEventListener('click',open);closeButton.removeEventListener('click',close);dialog.removeEventListener('close',restoreFocus);dialog.removeEventListener('click',backdrop);grid.removeEventListener('click',choose);dialog.remove();
  for(const [key,value]of Object.entries(previous))if(value===null)trigger.removeAttribute(`aria-${key}`);else trigger.setAttribute(`aria-${key}`,value);
 }};
}

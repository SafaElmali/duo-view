import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill,renderMedia,openBrowser} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const stills=process.argv.includes('--stills');
const output=path.resolve('out');fs.mkdirSync(output,{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.jsx'),publicDir:path.resolve('public')});
const browserExecutable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const options={browserExecutable:fs.existsSync(browserExecutable)?browserExecutable:undefined,chromiumOptions:{gl:'angle'}};
const browser=await openBrowser('chrome',options);
try{
 const composition=await selectComposition({serveUrl,id:'DuoView-Marketing',puppeteerInstance:browser,...options});
 if(stills){
  for(const frame of (process.argv.find(arg=>arg.startsWith('--frame='))?[Number(process.argv.find(arg=>arg.startsWith('--frame=')).split('=')[1])]:[85,155,265,390,565,770])){
   await renderStill({composition,serveUrl,puppeteerInstance:browser,frame,output:path.join(output,`frame-${frame}.png`),...options});
   console.log(`Preview frame ${frame} ready`);
  }
 }else{
  let last=-1;
  await renderMedia({composition,serveUrl,puppeteerInstance:browser,codec:'h264',crf:18,pixelFormat:'yuv420p',audioCodec:'aac',audioBitrate:'192k',outputLocation:path.join(output,'duo-view-marketing-1080p.mp4'),concurrency:3,...options,onProgress:({progress})=>{const percent=Math.floor(progress*100);if(percent>=last+5){last=percent;console.log(`Rendering ${percent}%`);}}});
  console.log('Video ready: out/duo-view-marketing-1080p.mp4');
 }
}finally{await browser.close({silent:true});}

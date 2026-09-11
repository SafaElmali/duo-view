import React from 'react';
import {AbsoluteFill,Sequence,Audio,Img,staticFile,useCurrentFrame,interpolate} from 'remotion';
import {Phone,ease} from './phone.jsx';

const blue='#4f75ff',ink='#172234',white='#f4f5f7';
const scenes=[
 {start:0,length:120,dark:true,kicker:'MEET DUO VIEW',lines:['The web.','In a new','shape.'],detail:'Explore your website on a folding screen.'},
 {start:120,length:180,dark:false,kicker:'YOUR SITE. ALL SIDES.',lines:['One URL.','Every angle.'],detail:'Folded. Open. Portrait. Landscape.'},
 {start:300,length:180,dark:false,kicker:'KEEP EXPLORING',lines:['Scroll.','Across','the fold.'],detail:'Both halves. One continuous preview.'},
 {start:480,length:180,dark:true,kicker:'PRESS PLAY',lines:['Big screen.','Hands-on','controls.'],detail:'Play. Pause. Scrub. Make it yours.'},
 {start:660,length:180,dark:false,kicker:'TRY DUO VIEW',lines:['Your website.','In every','fold.'],detail:'A new perspective is one URL away.'},
];

function Logo({dark}){return <div style={{position:'absolute',top:58,left:92,display:'flex',alignItems:'center',gap:13}}><Img src={staticFile('logo.svg')} style={{width:42,height:42,borderRadius:10}}/><span style={{fontSize:32,letterSpacing:-1.8,fontWeight:700,color:dark?white:ink}}>duo<span style={{color:blue}}>view</span></span></div>;}
function Scene({index,data}){
 const f=useCurrentFrame(),intro=ease(f,0,17,0,1),out=index===4?1:ease(f,data.length-12,data.length,1,0),opacity=intro*out;
 const color=data.dark?white:ink;
 const active=index===1?(f<35?0:f<102?1:f<125?2:3):0;
 return <AbsoluteFill style={{opacity,background:data.dark?'#080d18':'#f3f4f3',overflow:'hidden'}}>
  <AbsoluteFill style={{background:data.dark?'radial-gradient(ellipse at 73% 50%,#203256 0%,transparent 60%)':'radial-gradient(ellipse at 72% 50%,#ffffff 0%,transparent 65%)'}}/>
  <div style={{position:'absolute',left:990,top:870,width:630,height:70,borderRadius:'50%',background:data.dark?'#0009':'#273c5926',filter:'blur(35px)',transform:`scale(${ease(f,0,30,.7,1)})`}}/>
  <Logo dark={data.dark}/>
  <div style={{position:'absolute',left:98,top:225,width:700,zIndex:2}}>
   <div style={{fontSize:17,letterSpacing:3.7,fontWeight:600,color:blue,marginBottom:35,opacity:ease(f,5,22,0,1)}}>{data.kicker}</div>
   <div style={{fontSize:112,lineHeight:.99,letterSpacing:-6.6,fontWeight:600,color}}>
    {data.lines.map((line,i)=><div key={line} style={{overflow:'hidden',paddingBottom:5}}><div style={{transform:`translateY(${ease(f,8+i*5,29+i*5,115,0)}%)`}}>{line}</div></div>)}
   </div>
   <p style={{fontSize:26,lineHeight:1.5,maxWidth:560,color:data.dark?'#a7b2c7':'#738094',marginTop:32,opacity:ease(f,28,44,0,1),transform:`translateY(${ease(f,28,44,12,0)}px)`}}>{data.detail}</p>
   {index===1&&<div style={{marginTop:40,width:560}}>
    <div style={{height:70,borderRadius:16,background:'#fff',border:'1px solid #dde3ed',boxShadow:'0 14px 35px #2636500a',padding:'21px 23px',fontSize:23,color:'#66748c',display:'flex',alignItems:'center',gap:16}}><span style={{color:blue}}>↗</span><span>{'your-website.com'.slice(0,Math.floor(ease(f,10,36,0,16)))}</span><span style={{height:23,width:2,background:blue,opacity:Math.floor(f/10)%2}}/><span style={{marginLeft:'auto',color:blue,fontWeight:700}}>→</span></div>
    <div style={{display:'flex',gap:9,marginTop:19}}>{['Folded','Open','Portrait','Landscape'].map((label,i)=><div key={label} style={{padding:'11px 15px',fontSize:18,color:i===active?'#fff':'#8290a4',background:i===active?blue:'#e8ecf2',borderRadius:40}}>{label}</div>)}</div>
   </div>}
   {index===2&&<div style={{display:'flex',gap:10,alignItems:'center',marginTop:38,fontSize:18,color:'#526b97'}}><span style={{height:9,width:9,background:blue,borderRadius:10}}/>Scrollable snapshot preview</div>}
   {index===3&&<div style={{display:'flex',gap:12,marginTop:36}}>{['▶ Play','↔ Seek','♫ Sound'].map((label,i)=><div key={label} style={{border:'1px solid #354666',background:i===Math.min(2,Math.floor(f/65))?'#293e62':'#142038',padding:'14px 20px',borderRadius:12,color:'#c6d4ee',fontSize:20}}>{label}</div>)}</div>}
   {index===4&&<div style={{marginTop:34,opacity:ease(f,38,58,0,1)}}><div style={{display:'inline-flex',alignItems:'center',gap:38,padding:'22px 29px',background:blue,color:'#fff',borderRadius:15,fontSize:25,fontWeight:600,boxShadow:'0 15px 32px #4f75ff28'}}>Try Duo View <span>↗</span></div><div style={{fontSize:25,color:'#63748c',marginTop:22,letterSpacing:-.3}}>duo-view.netlify.app</div></div>}
  </div>
  <div style={{opacity:ease(f,4,25,0,1),transform:`translateY(${ease(f,0,35,25,0)}px)`}}><Phone scene={index} frame={f}/></div>
  <div style={{position:'absolute',bottom:42,left:98,right:98,display:'flex',justifyContent:'space-between',alignItems:'center',color:data.dark?'#71819c':'#9aa5b4',fontSize:15}}><span>{index===3?'Sintel © Blender Foundation · CC BY 3.0':'Independent simulator · Illustrative device'}</span><span style={{letterSpacing:3,fontSize:13}}>DUO VIEW / {String(index+1).padStart(2,'0')}</span></div>
 </AbsoluteFill>;
}

export function DuoMarketing(){return <AbsoluteFill style={{fontFamily:'Arial,Helvetica,sans-serif',background:'#080d18'}}>
 <Audio src={staticFile('duo-score.wav')} volume={f=>interpolate(f,[0,20,800,839],[0,.65,.65,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>
 {scenes.map((scene,index)=><Sequence key={scene.start} from={scene.start} durationInFrames={scene.length} premountFor={20}><Scene index={index} data={scene}/></Sequence>)}
</AbsoluteFill>;}

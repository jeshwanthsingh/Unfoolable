import type {Texture as PixiTexture} from 'pixi.js';
import {useEffect,useRef,useState} from 'react';
import {officeTransition,type OfficeFrame} from './office-model.ts';
import {workshopRoute,type OfficeActivity} from './office-activity.ts';
type Props={frame:OfficeFrame;theme:'light'|'dark';activity?:OfficeActivity;onCanvas?:(canvas:HTMLCanvasElement|null)=>void;sound?:boolean;replay?:boolean};
const poses=['idle','walk-down','walk-up','walk-left','walk-right','type','read','carry','celebrate','worried','frozen','wave'];
export function WorkshopRoom({frame,theme,activity,onCanvas,sound=false,replay=false}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef({frame,activity,sound,replay}),engine=useRef<{update:()=>void;destroy:()=>void}|null>(null),[failed,setFailed]=useState(false);latest.current={frame,activity,sound,replay};
 useEffect(()=>{if(!host.current)return;let disposed=false,owned:{update:()=>void;destroy:()=>void}|null=null;
 void(async()=>{
  const {Application,Container,Sprite,Texture,Rectangle,Graphics,Assets,Text,EventsTicker,Ticker}=await import('pixi.js');if(disposed)return;
  const app=new Application();await app.init({width:960,height:576,backgroundAlpha:0,antialias:false,autoStart:false,preference:'webgl',resolution:1});if(disposed){app.destroy(true,{children:true});return;}
  let raf:number|undefined,dead=false,frames=0,elapsed=0,last=0,previous:OfficeFrame|null=null,previousActivity=-1,first=true,route:{x:number;y:number}[]=[],position={x:110,y:168},target={...position};
  const cancel=()=>{if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;last=0;};
  const destroy=()=>{if(dead)return;dead=true;cancel();document.removeEventListener('visibilitychange',visibility);onCanvas?.(null);app.destroy(true,{children:true,texture:false});};owned={update:()=>{},destroy};
  const stationOnly=true;
  const urls=['/workshop-pixel/'+(stationOnly?'builder':'room')+'-'+theme+'.png',...['builder','grader','writer','owner','package'].map(x=>'/workshop-pixel/'+x+'.png')];const textures=await Promise.all(urls.map(url=>Assets.load<PixiTexture>(url)));if(disposed){destroy();return;}
  for(const t of textures)t.source.scaleMode='nearest';
  const world=new Container();world.scale.set(2);app.stage.addChild(world);const sky=new Graphics();world.addChild(sky);const background=new Sprite(textures[0]);world.addChild(background);
  const lamp=new Graphics();world.addChild(lamp);const tube=new Graphics();world.addChild(tube);
  const spriteFrames=textures.slice(1,5).map(t=>poses.map((_,row)=>Array.from({length:4},(_,f)=>new Texture({source:t.source,frame:new Rectangle(f*32,row*32,32,32)}))));
  const actors=spriteFrames.map((frames)=>{const s=new Sprite(frames[0]![0]);s.anchor.set(.5,1);world.addChild(s);return s;});actors[1]!.position.set(390,155);actors[2]!.position.set(245,97);actors[3]!.position.set(367,259);
  if(stationOnly)actors.slice(1).forEach(a=>a.visible=false);
  const parcel=new Sprite(textures[5]);parcel.anchor.set(.5,.8);parcel.width=24;parcel.height=24;world.addChild(parcel);const fx=new Graphics();world.addChild(fx);const clock=new Graphics();world.addChild(clock);
  const bubble=new Text({text:'',style:{fontFamily:'Instrument Sans, system-ui, sans-serif',fontSize:7,fontWeight:'600',fill:theme==='dark'?'#f2e5c8':'#283d40',wordWrap:true,wordWrapWidth:125}});bubble.anchor.set(.5,1);world.addChild(bubble);
  const backing=new Graphics();world.addChildAt(backing,world.children.length-1);
  app.stage.eventMode='none';EventsTicker.removeTickerListener();Ticker.system.stop();host.current!.replaceChildren(app.canvas);app.canvas.setAttribute('aria-hidden','true');onCanvas?.(app.canvas);
  function setPose(i:number,name:string,frameIndex:number){actors[i]!.texture=spriteFrames[i]![Math.max(0,poses.indexOf(name))]![frameIndex%4]!;}
  function update(){const f=latest.current.frame,a=latest.current.activity;const changed=officeTransition(previous,f);if(changed&&f.stamp&&f.stamp!==previous?.stamp)host.current?.setAttribute('data-result-event',String(f.motionSequence));if(a?.sequence!==previousActivity||f.phase!==previous?.phase){const steps=workshopRoute(a?.action??'idle');route=steps.slice(1);target=steps.at(-1)!;if(first){position={...target};route=[];}previousActivity=a?.sequence??-1;}previous=f;first=false;if(!document.hidden&&raf===undefined)raf=requestAnimationFrame(tick);}
  function paint(dt:number){const {frame:f,activity:a}=latest.current;const now=new Date(),hour=now.getHours(),night=hour<7||hour>=19;sky.clear().rect(41,19,99,23).fill(night?0x263e5b:0xaac4bf);if(night)sky.rect(121,23,5,5).fill(0xeed9a8).rect(56,23,1,1).rect(101,33,1,1).fill(0xeee2c7);else sky.rect(119,22,7,7).fill(0xe8ce91).rect(48,32,18,2).fill(0xe6e0c9);
   lamp.clear();for(const x of [24,280,456])lamp.ellipse(x,43,14,4).fill({color:0xf2c87e,alpha:night?.12:.05});
   const action=a?.action??'idle',freeze=f.alarm||f.dimmed||action==='stopped',next=route[0],dx=next?next.x-position.x:0,dy=next?next.y-position.y:0,distance=Math.hypot(dx,dy),walk=!!next&&!freeze;
   if(walk&&distance<1){position={...next!};route.shift();}else if(walk){const step=Math.min(distance,dt*70);position.x+=dx/distance*step;position.y+=dy/distance*step;}
   const k=Math.floor(elapsed*6)%4;let pose=action==='type'?'type':action==='read'?'read':action==='frozen'?'frozen':action==='inspect'?'wave':'idle';if(walk)pose=Math.abs(dx)>Math.abs(dy)?dx<0?'walk-left':'walk-right':dy<0?'walk-up':'walk-down';if(f.alarm)pose='frozen';
   setPose(0,pose,freeze?0:k);actors[0]!.position.set(Math.round(position.x),Math.round(position.y));actors[0]!.scale.set(1,walk?1+.015*Math.sin(elapsed*12):1);
   setPose(1,f.activeRole==='grader'?'type':'idle',k);setPose(2,'idle',k);setPose(3,'idle',k);
   const stamp=f.stamp;const dest=f.phase==='checking'?{x:305,y:158}:f.phase==='queued'?{x:100,y:226}:['ready_for_review','kept','discarded'].includes(f.phase)?{x:391,y:222}:{x:157,y:180};parcel.visible=!!f.ticketId&&f.sequence>0;parcel.position.set(dest.x,dest.y);
   tube.clear();if(a?.tests&&!stationOnly){const count=Math.min(8,Math.floor(a.tests.passed/a.tests.total*8));for(let i=0;i<8;i++)tube.rect(369+i*9,77,4,9).fill(i<count?0x83bc8c:0x657e78);}
   if(action==='type'){for(let j=0;j<3;j++)tube.rect(103,105+j*3,6+((Math.floor(elapsed*4)+j)%4)*3,1).fill(0x90c5b3);}
   // Ambient steam/blinks/sky never claim work; clocks use actual local time.
   if(!freeze)for(let i=0;i<3;i++){const p=(elapsed*.3+i/3)%1;tube.rect(134+Math.round(Math.sin(p*6)),125-Math.round(p*8),1,2).fill({color:0xe7dcc5,alpha:(1-p)*.45});}
   clock.clear();const hands=[{angle:(now.getHours()%12+now.getMinutes()/60)*Math.PI/6,length:5},{angle:now.getMinutes()*Math.PI/30,length:7}];for(const h of hands)clock.moveTo(205,30).lineTo(205+Math.sin(h.angle)*h.length,30-Math.cos(h.angle)*h.length).stroke({width:1,color:0x344b4b});
   backing.clear();bubble.text=a?.bubble??'';bubble.position.set(Math.round(position.x),position.y-35);if(bubble.text){backing.roundRect(bubble.x-bubble.width/2-5,bubble.y-bubble.height-4,bubble.width+10,bubble.height+8,3).fill(theme==='dark'?0x334747:0xf2e5c9).stroke({color:0xbaa174,width:1});}
   fx.clear();if(stamp&&!stationOnly){const color=stamp==='checked'?0x85b48e:stamp==='look closer'?0xdbb471:0xcd7764;fx.circle(432,173,9).fill(color).circle(432,173,7).stroke({color:0x263d3f,width:1});if(stamp==='checked')fx.moveTo(428,173).lineTo(431,176).lineTo(437,169).stroke({color:0x263d3f,width:2});else if(stamp==='look closer')fx.circle(431,172,3).stroke({color:0x263d3f,width:1}).moveTo(433,174).lineTo(436,177).stroke({color:0x263d3f,width:1});else fx.moveTo(429,170).lineTo(435,176).moveTo(435,170).lineTo(429,176).stroke({color:0x263d3f,width:2});}
   if(f.alarm){fx.circle(297,48,4).fill(Math.floor(elapsed*2)%2?0xd7755d:0x924b42);}if(f.dimmed)fx.rect(8,9,464,266).fill({color:0x172a30,alpha:.5});
   const focus=stationOnly?{x:120,y:120}:action==='inspect'?{x:320,y:145}:{x:240,y:144};const zoom=stationOnly?1.55:1;world.scale.set(2*zoom);world.position.set(480-focus.x*2*zoom,288-focus.y*2*zoom);
   app.renderer.render(app.stage);if(host.current){host.current.dataset.officeFrames=String(++frames);host.current.dataset.officeAction=action;host.current.dataset.officeBuilder=JSON.stringify(position);}
  }
  function tick(timestamp:number){raf=undefined;if(dead||disposed||document.hidden)return;const dt=last?Math.min(.05,(timestamp-last)/1000):0;last=timestamp;elapsed+=dt;paint(dt);raf=requestAnimationFrame(tick);}
  function visibility(){cancel();if(!document.hidden&&!dead)raf=requestAnimationFrame(tick);}
  document.addEventListener('visibilitychange',visibility);owned.update=update;engine.current=owned;update();
 })().catch(()=>{owned?.destroy();if(!disposed)setFailed(true);});
 return()=>{disposed=true;engine.current=null;owned?.destroy();};
 },[theme,onCanvas]);
 useEffect(()=>{engine.current?.update();},[frame,activity]);
 return <><div className="office-canvas" ref={host}/>{failed&&<p role="status">The drawing is unavailable. Your ticket and proof are still available.</p>}</>;
}

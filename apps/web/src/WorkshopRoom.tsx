import {officeLight} from './office-light.ts';
import type {Texture as PixiTexture} from 'pixi.js';
import {useEffect,useRef,useState} from 'react';
import {officeTransition,type OfficeFrame,type OfficeRole} from './office-model.ts';
import {officeClick} from './office-sound.ts';
import {workshopRoute,type OfficeActivity} from './office-activity.ts';
type Props={frame:OfficeFrame;theme:'light'|'dark';activity?:OfficeActivity;onCanvas?:(canvas:HTMLCanvasElement|null)=>void;sound?:boolean;replay?:boolean;onRole?:(role:OfficeRole)=>void;title?:string};
const poses=['idle','walk-down','walk-up','walk-left','walk-right','type','read','carry','celebrate','worried','frozen','wave'];
export function WorkshopRoom({frame,theme,activity,onCanvas,sound=false,replay=false,onRole,title}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef({frame,activity,sound,replay,onRole,title}),engine=useRef<{update:()=>void;destroy:()=>void}|null>(null),[failed,setFailed]=useState(false);latest.current={frame,activity,sound,replay,onRole,title};
 useEffect(()=>{if(!host.current)return;let disposed=false,owned:{update:()=>void;destroy:()=>void}|null=null;
 void(async()=>{
  const {Application,Container,Sprite,Texture,Rectangle,Graphics,Assets,Text,EventsTicker,Ticker}=await import('pixi.js');if(disposed)return;
  const {AdjustmentFilter}=await import('../vendor/pixi-filters-6.1.5/lib/adjustment/AdjustmentFilter.mjs');const {AdvancedBloomFilter}=await import('../vendor/pixi-filters-6.1.5/lib/advanced-bloom/AdvancedBloomFilter.mjs');
  const app=new Application();await app.init({width:960,height:576,backgroundAlpha:0,antialias:false,autoStart:false,preference:'webgl',resolution:1});if(disposed){app.destroy(true,{children:true});return;}
  let resize:ResizeObserver|undefined;let raf:number|undefined,published=false,dead=false,frames=0,elapsed=0,last=0,renderedAt=0,previous:OfficeFrame|null=null,previousActivity=-1,effectAt=-100,packagePosition={x:157,y:180},packageTarget={x:157,y:180},packageRoute:{x:number;y:number}[]=[],paintTotal=0,paintCount=0,first=true,route:{x:number;y:number}[]=[],position={x:110,y:168},target={...position};
  const cancel=()=>{if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;last=0;};
  const destroy=()=>{if(dead)return;dead=true;resize?.disconnect();cancel();document.removeEventListener('visibilitychange',visibility);app.canvas.removeEventListener('pointerup',hit);if(published&&host.current?.contains(app.canvas))onCanvas?.(null);app.destroy(true,{children:true,texture:false});};owned={update:()=>{},destroy};
  const stationOnly=false;
  const urls=['/workshop-pixel/'+(stationOnly?'builder':'room')+'-'+theme+'.png',...['builder','grader','writer','owner','package'].map(x=>'/workshop-pixel/'+x+'.png')];const textures=await Promise.all(urls.map(url=>Assets.load<PixiTexture>(url)));if(disposed){destroy();return;}
  for(const t of textures)t.source.scaleMode='nearest';
  const world=new Container();world.scale.set(2);app.stage.addChild(world);const grade=new AdjustmentFilter();world.filters=[grade];const sky=new Graphics();world.addChild(sky);const background=new Sprite(textures[0]);world.addChild(background);
  const lamp=new Graphics();world.addChild(lamp);const tube=new Graphics();world.addChild(tube);
  const spriteFrames=textures.slice(1,5).map(t=>poses.map((_,row)=>Array.from({length:4},(_,f)=>new Texture({source:t.source,frame:new Rectangle(f*48,row*48,48,48)}))));
  const actors=spriteFrames.map((frames)=>{const s=new Sprite(frames[0]![0]);s.anchor.set(.5,1);world.addChild(s);return s;});actors[1]!.position.set(390,155);actors[2]!.position.set(245,97);actors[3]!.position.set(367,259);
  if(stationOnly)actors.slice(1).forEach(a=>a.visible=false);
  const shadows=new Graphics();world.addChildAt(shadows,4);
  const atmosphere=new Container();world.addChild(atmosphere);const pools=new Graphics(),beams=new Graphics(),dust=new Graphics();atmosphere.addChild(pools,beams,dust);pools.blendMode='add';beams.blendMode='add';const bloom=new AdvancedBloomFilter({threshold:.35,bloomScale:.35,brightness:1,blur:3,quality:3});pools.filters=[bloom];pools.filterArea=new Rectangle(0,0,480,288);
  const parcel=new Sprite(textures[5]);parcel.anchor.set(.5,.8);parcel.width=24;parcel.height=24;world.addChild(parcel);const fx=new Graphics();world.addChild(fx);const clock=new Graphics();world.addChild(clock);
  const bubble=new Text({text:'',style:{fontFamily:'Instrument Sans, system-ui, sans-serif',fontSize:7,fontWeight:'600',fill:theme==='dark'?'#f2e5c8':'#283d40',wordWrap:true,wordWrapWidth:125}});bubble.anchor.set(.5,1);world.addChild(bubble);
  const captionPlate=new Graphics();app.stage.addChild(captionPlate);
  const caption=new Text({text:'',style:{fontFamily:'Instrument Sans, system-ui, sans-serif',fontSize:12,fontWeight:'600',fill:theme==='dark'?'#e8dcc1':'#34494a'}});caption.position.set(32,27);app.stage.addChild(caption);
  const backing=new Graphics();world.addChildAt(backing,world.children.length-1);
  resize=new ResizeObserver(()=>{if(host.current){app.renderer.resize(host.current.clientWidth,host.current.clientHeight);}});resize.observe(host.current!);app.renderer.resize(host.current!.clientWidth,host.current!.clientHeight);
  app.stage.eventMode='none';EventsTicker.removeTickerListener();Ticker.system.stop();host.current!.replaceChildren(app.canvas);app.canvas.setAttribute('aria-hidden','true');published=true;onCanvas?.(app.canvas);
  function setPose(i:number,name:string,frameIndex:number){actors[i]!.texture=spriteFrames[i]![Math.max(0,poses.indexOf(name))]![frameIndex%4]!;}
  function update(){const f=latest.current.frame,a=latest.current.activity;const changed=officeTransition(previous,f),reset=!!previous&&f.sequence<=previous.sequence;if(reset){first=true;effectAt=-100;}
   if(changed&&f.stamp&&f.stamp!==previous?.stamp){effectAt=elapsed;host.current?.setAttribute('data-result-event',String(f.motionSequence));if(latest.current.sound)officeClick();}
   if(a?.sequence!==previousActivity||f.phase!==previous?.phase){const steps=workshopRoute(a?.action??'idle');route=[{x:position.x,y:168},...steps];target=steps.at(-1)!;if(first){position={...target};route=[];}previousActivity=a?.sequence??-1;}
   if(first||f.phase!==previous?.phase){packageTarget=f.phase==='checking'?{x:326,y:158}:['ready_for_review','kept','discarded'].includes(f.phase)?{x:391,y:222}:{x:157,y:180};packageRoute=first?[]:f.phase==='checking'?[{x:232,y:180},{x:232,y:158},packageTarget]:[{x:300,y:158},{x:300,y:203},{x:391,y:203},packageTarget];if(first)packagePosition={...packageTarget};}
   previous=f;first=false;if(!document.hidden&&raf===undefined)raf=requestAnimationFrame(tick);
  }
  function paint(dt:number){const paintStarted=performance.now();const {frame:f,activity:a}=latest.current;const now=new Date(),hour=now.getHours(),light=officeLight(hour),night=light.period==='night';grade.brightness=light.brightness;grade.red=light.red;grade.green=light.green;grade.blue=light.blue;host.current?.setAttribute('data-light-period',light.period);sky.clear().rect(41,19,99,23).fill(light.sky);if(night)sky.rect(121,23,5,5).fill(0xeed9a8).rect(56,23,1,1).rect(101,33,1,1).fill(0xeee2c7);else sky.rect(119,22,7,7).fill(0xe8ce91).rect(48,32,18,2).fill(0xe6e0c9);
   lamp.clear();pools.clear();beams.clear();dust.clear();shadows.clear();
   for(const [x,y,rx,ry,color] of [[24,48,45,55,0xfeae34],[280,48,52,58,0xfeae34],[456,48,40,58,0xfeae34],[112,114,40,30,0x2ce8f5],[390,119,54,39,0x2ce8f5],[260,54,36,33,0xfee761]]){
    for(let i=5;i>0;i--)pools.ellipse(x!,y!,rx!*i/5,ry!*i/5).fill({color:color!,alpha:light.lamps*.018*(6-i)});
   }
   if(light.beam){for(let i=0;i<3;i++)beams.poly([44+i*30,43,61+i*30,43,151+i*30,190,96+i*30,190]).fill({color:0xead4aa,alpha:light.beam});for(let i=0;i<22;i++){const x=64+(i*37)%132+Math.sin(elapsed*.25+i)*3,y=58+(i*23+elapsed*3)%130;dust.rect(Math.round(x),Math.round(y),1,1).fill({color:0xead4aa,alpha:.2});}}
   for(const actor of actors)shadows.ellipse(actor.x,actor.y-2,13,4).fill({color:0x181425,alpha:.3});
   for(const [x,y,w] of [[78,145,68],[217,86,56],[356,147,68],[338,250,94]])shadows.ellipse(x!+w!/2,y!,w!/2,5).fill({color:0x181425,alpha:.18});
   const action=a?.action??'idle',freeze=f.alarm||f.dimmed||action==='stopped',next=route[0],dx=next?next.x-position.x:0,dy=next?next.y-position.y:0,distance=Math.hypot(dx,dy),walk=!!next&&!freeze;
   if(walk&&distance<1){position={...next!};route.shift();}else if(walk){const step=Math.min(distance,dt*70);position.x+=dx/distance*step;position.y+=dy/distance*step;}
   const k=Math.floor(elapsed*6)%4;let pose=action==='type'?'type':action==='read'?'read':action==='frozen'?'frozen':action==='inspect'?'wave':'idle';if(walk)pose=Math.abs(dx)>Math.abs(dy)?dx<0?'walk-left':'walk-right':dy<0?'walk-up':'walk-down';if(f.alarm)pose='frozen';
   if(f.stamp==='checked'&&elapsed-effectAt<.8)pose='celebrate';else if(f.phase==='needs_you'&&!f.alarm)pose='worried';
   const idleFrame=elapsed%5>4.84?3:Math.floor(elapsed/1.4)%2;setPose(0,pose,freeze?0:pose==='idle'?idleFrame:k);actors[0]!.position.set(Math.round(position.x),Math.round(position.y));actors[0]!.scale.set(1);
   setPose(1,f.activeRole==='grader'?'type':'idle',f.activeRole==='grader'?k:idleFrame);setPose(2,'idle',idleFrame);setPose(3,'idle',idleFrame);
   const stamp=f.stamp,age=elapsed-effectAt;const pt=packageRoute[0];if(pt&&!freeze){const dx=pt.x-packagePosition.x,dy=pt.y-packagePosition.y,len=Math.hypot(dx,dy),step=Math.min(len,dt*110);if(len<1){packagePosition={...pt};packageRoute.shift();}else{packagePosition.x+=dx/len*step;packagePosition.y+=dy/len*step;}}
   parcel.visible=!!f.ticketId&&f.sequence>0;parcel.position.set(Math.round(packagePosition.x),Math.round(packagePosition.y));
   tube.clear();if(a?.tests&&!stationOnly){const count=Math.min(8,Math.floor(a.tests.passed/a.tests.total*8));for(let i=0;i<8;i++)tube.rect(369+i*9,77,4,9).fill(i<count?0x83bc8c:0x657e78);}
   if(action==='type'){for(let j=0;j<3;j++)tube.rect(103,105+j*3,6+((Math.floor(elapsed*4)+j)%4)*3,1).fill(0x90c5b3);}
   // Ambient steam/blinks/sky never claim work; clocks use actual local time.
   if(!freeze)for(let i=0;i<3;i++){const p=(elapsed*.3+i/3)%1;tube.rect(134+Math.round(Math.sin(p*6)),125-Math.round(p*8),1,2).fill({color:0xe7dcc5,alpha:(1-p)*.45});}
   clock.clear();const hands=[{angle:(now.getHours()%12+now.getMinutes()/60)*Math.PI/6,length:5},{angle:now.getMinutes()*Math.PI/30,length:7}];for(const h of hands)clock.moveTo(205,30).lineTo(205+Math.sin(h.angle)*h.length,30-Math.cos(h.angle)*h.length).stroke({width:1,color:0x344b4b});
   backing.clear();bubble.text=a?.bubble||(a?.writer==='preparing'?'Preparing test session':f.phase==='needs_you'?'Needs you':'');const talk=a?.bubble&&a.action==='inspect'?{x:390,y:155}:!a?.bubble&&a?.writer==='preparing'?{x:245,y:97}:position;bubble.position.set(Math.round(talk.x),talk.y-50);if(bubble.text){backing.roundRect(bubble.x-bubble.width/2-5,bubble.y-bubble.height-4,bubble.width+10,bubble.height+8,3).fill(theme==='dark'?0x334747:0xf2e5c9).stroke({color:0xbaa174,width:1});}
   fx.clear();if(stamp&&!stationOnly){const color=stamp==='checked'?0x85b48e:stamp==='look closer'?0xdbb471:0xcd7764;fx.circle(432,173,9*(age>=0&&age<.18?1.12-age/.18*.12:1)).fill(color).circle(432,173,7).stroke({color:0x263d3f,width:1});if(stamp==='checked')fx.moveTo(428,173).lineTo(431,176).lineTo(437,169).stroke({color:0x263d3f,width:2});else if(stamp==='look closer')fx.circle(431,172,3).stroke({color:0x263d3f,width:1}).moveTo(433,174).lineTo(436,177).stroke({color:0x263d3f,width:1});else fx.moveTo(429,170).lineTo(435,176).moveTo(435,170).lineTo(429,176).stroke({color:0x263d3f,width:2});}
   if(f.alarm){fx.circle(297,48,4).fill(Math.floor(elapsed*2)%2?0xd7755d:0x924b42);}if(f.dimmed)fx.rect(8,9,464,266).fill({color:0x172a30,alpha:.5});
   if(age>=0&&age<.18&&stamp){const press=1-Math.exp(-age*40),y=145+press*21;fx.rect(428,y-10,8,10).fill(0xddb976).rect(421,y,22,5).fill(0x6e5140);}
   if(age>=0&&age<.7&&stamp){for(let i=0;i<14;i++){const theta=i*2.399,spread=age*34,x=432+Math.cos(theta)*spread,y=173+Math.sin(theta)*spread+age*age*20;fx.rect(Math.round(x),Math.round(y),i%2?2:1,2).fill({color:stamp==='checked'?(i%2?0x8eba8a:0xd9c28f):0xddc398,alpha:1-age/.7});}if(stamp==='look closer')fx.moveTo(430,166).lineTo(434,166).moveTo(432,164).lineTo(432,168).stroke({color:0xf5e7bf,width:1});}
   // Integer world scale: no fractional zoom or softened sprite sampling.
   const scale=Math.max(1,Math.floor(Math.min(app.screen.width/480,app.screen.height/288)));world.scale.set(scale);world.position.set(Math.floor((app.screen.width-480*scale)/2),Math.floor((app.screen.height-288*scale)/2));
   caption.text=latest.current.replay?'Replay   '+(latest.current.title?.slice(0,72)??'The Workshop'):'';captionPlate.clear();if(caption.text)captionPlate.roundRect(24,20,caption.width+16,26,5).fill(theme==='dark'?0x263b3f:0xeee0c2);
   app.renderer.render(app.stage);if(host.current){host.current.dataset.officeFrames=String(++frames);host.current.dataset.officeAction=action;host.current.dataset.officeBuilder=JSON.stringify(position);paintTotal+=performance.now()-paintStarted;paintCount++;if(paintCount%60===0)host.current.dataset.officePaintMs=(paintTotal/paintCount).toFixed(3);}
  }
  function tick(timestamp:number){raf=undefined;if(dead||disposed||document.hidden)return;if(timestamp-renderedAt<1000/60-.7){raf=requestAnimationFrame(tick);return;}renderedAt=timestamp;const dt=last?Math.min(.05,(timestamp-last)/1000):0;last=timestamp;elapsed+=dt;paint(dt);raf=requestAnimationFrame(tick);}
  function hit(event:PointerEvent){const rect=app.canvas.getBoundingClientRect(),x=((event.clientX-rect.left)/rect.width*app.screen.width-world.x)/world.scale.x,y=((event.clientY-rect.top)/rect.height*app.screen.height-world.y)/world.scale.y;for(let i=0;i<actors.length;i++){const actor=actors[i]!;if(Math.abs(x-actor.x)<18&&y>actor.y-34&&y<actor.y+5){latest.current.onRole?.((['builder','grader','writer','owner'] as const)[i]!);return;}}}
  app.canvas.addEventListener('pointerup',hit);
  function visibility(){cancel();if(!document.hidden&&!dead)raf=requestAnimationFrame(tick);}
  document.addEventListener('visibilitychange',visibility);owned.update=update;engine.current=owned;update();
 })().catch(()=>{owned?.destroy();if(!disposed)setFailed(true);});
 return()=>{disposed=true;engine.current=null;owned?.destroy();};
 },[theme,onCanvas]);
 useEffect(()=>{engine.current?.update();},[frame,activity]);
 return <><div className="office-canvas" ref={host}/>{failed&&<p role="status">The drawing is unavailable. Your ticket and proof are still available.</p>}</>;
}

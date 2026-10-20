import {useEffect,useRef,useState} from 'react';
import {officeDesks,builderPose,cratePose,officeTransition,type OfficeFrame} from './office-model.ts';
import {stationSpring} from './workshop-motion.ts';
type Engine={update:(frame:OfficeFrame)=>void;destroy:()=>void};
export function WorkshopRoom({frame,theme}:{frame:OfficeFrame;theme:'light'|'dark'}){
 const host=useRef<HTMLDivElement>(null),latest=useRef(frame),engine=useRef<Engine|null>(null),[failed,setFailed]=useState(false);latest.current=frame;
 useEffect(()=>{if(!host.current)return;let disposed=false,owned:Engine|null=null;
 void (async()=>{
  const {Application,Graphics,Sprite,Assets,EventsTicker,Ticker}=await import('pixi.js');if(disposed)return;
  const app=new Application();await app.init({width:1000,height:620,backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl'});if(disposed){app.destroy(true,{children:true});return;}
  let raf:number|undefined,previous:OfficeFrame|null=null,frames=0,destroyed=false;const cancel=()=>{if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;app.stop();};
  const dark=theme==='dark',floor=dark?0x273034:0xe8e9e4,wood=dark?0x987650:0xd6bd91,brass=dark?0xc2a170:0x8a6d3d,ink=dark?0xdce1e5:0x2a2f35;
  const room=new Graphics().roundRect(20,25,960,570,20).fill(floor).stroke({color:brass,width:2});
  for(let y=65;y<595;y+=40)room.moveTo(26,y).lineTo(974,y);room.stroke({color:brass,width:1,alpha:.09});
  room.moveTo(60,410).lineTo(585,410).lineTo(585,510).lineTo(875,510).stroke({color:brass,width:3,alpha:.3});
  // Glass boundary is architectural; Builder coordinates are always outside it.
  room.roundRect(620,100,320,280,12).fill({color:0x8db8b0,alpha:dark?.12:.15}).stroke({color:dark?0xa8c5c0:0x688e86,width:3});
  room.moveTo(630,110).lineTo(930,110).moveTo(930,110).lineTo(930,370).stroke({color:0xffffff,width:2,alpha:.25});
  room.roundRect(645,127,270,25,3).fill({color:brass,alpha:.18});
  // Closed handoff hatch, rather than a route for the Builder to enter.
  room.roundRect(610,270,20,70,4).fill(wood).stroke({color:brass,width:2});
  const bench=(x:number,y:number,w:number)=>{room.roundRect(x,y,w,56,7).fill(wood).stroke({color:brass,width:2}).rect(x+12,y+56,12,35).rect(x+w-24,y+56,12,35).fill({color:wood,alpha:.7});};
  for(const d of officeDesks)bench(d.bench.x,d.bench.y,d.bench.width);
  // Work tools, lamp and paper are original simple primitives, not office-pack assets.
  room.roundRect(150,218,80,10,3).fill({color:ink,alpha:.4}).roundRect(340,220,27,26,3).fill({color:ink,alpha:.25});
  room.moveTo(347,218).lineTo(347,184).lineTo(325,170).stroke({color:brass,width:6}).roundRect(306,160,36,12,4).fill(brass);
  room.roundRect(215,64,74,28,2).fill({color:0xffffff,alpha:.5}).roundRect(737,208,60,14,2).fill({color:0xffffff,alpha:.3});
  room.circle(798,480,14).fill(brass).rect(791,480,14,24).fill(brass);
  app.stage.addChild(room);const actors=new Graphics();app.stage.addChild(actors);const overlay=new Graphics();app.stage.addChild(overlay);
  app.stage.eventMode='none';EventsTicker.removeTickerListener();Ticker.system.stop();host.current!.replaceChildren(app.canvas);app.canvas.setAttribute('aria-hidden','true');
  owned={update:()=>{},destroy:()=>{if(destroyed)return;destroyed=true;cancel();document.removeEventListener('visibilitychange',hide);app.destroy(true,{children:true,texture:false});}};
  const texture=await Assets.load('/workshop/crate_E.png');if(disposed){owned.destroy();owned=null;return;}const crate=new Sprite(texture);crate.anchor.set(.5);crate.width=42;crate.height=44;app.stage.addChild(crate);app.stage.addChild(overlay);
  let builder=builderPose(latest.current),box=cratePose(latest.current);
  function paint(f:OfficeFrame,press=1){
   actors.clear();overlay.clear();
   for(const d of officeDesks){const p=d.role==='builder'?builder:{x:d.x,y:d.y+55},active=f.activeRole===d.role,color=f.alarm&&d.role==='builder'?0xb8432f:active?brass:dark?0x91a7a8:0x708a8b;
    actors.roundRect(p.x-21,p.y-24,42,34,10).fill(color).stroke({color:ink,width:2,alpha:.5}).circle(p.x-7,p.y-10,2.5).circle(p.x+7,p.y-10,2.5).fill(dark?0x172025:0xfafbfc).roundRect(p.x-15,p.y+13,30,19,5).fill({color,alpha:.7});
    if(active)actors.roundRect(p.x-26,p.y-29,52,69,13).stroke({color:brass,width:2,alpha:.6});
   }
   if(f.stamp){const color=f.stamp==='checked'?0x2f7a57:f.stamp==='look closer'?0xb5762a:0xb8432f,x=856,y=316,r=25*press;actors.circle(x,y,r).fill({color,alpha:.2}).circle(x,y,r-4).stroke({color,width:3});if(f.stamp==='checked')actors.moveTo(x-10,y).lineTo(x-3,y+7).lineTo(x+11,y-9).stroke({color,width:4});else if(f.stamp==='failed')actors.moveTo(x-8,y-8).lineTo(x+8,y+8).moveTo(x+8,y-8).lineTo(x-8,y+8).stroke({color,width:4});else actors.circle(x,y,8).stroke({color,width:3}).moveTo(x+7,y+7).lineTo(x+14,y+14).stroke({color,width:3});}
   if(f.humanDecision){const rejected=/discard|reject|abandon/i.test(f.humanDecision),color=rejected?0xb8432f:brass;actors.circle(741,490,17).stroke({color,width:3});if(rejected)actors.moveTo(733,482).lineTo(749,498).moveTo(749,482).lineTo(733,498).stroke({color,width:3});else actors.moveTo(732,490).lineTo(739,497).lineTo(750,482).stroke({color,width:3});}
   if(f.alarm)actors.circle(580,120,18).fill({color:0xb8432f,alpha:.2}).circle(580,120,8).fill(0xb8432f);
   if(f.dimmed)overlay.roundRect(20,25,960,570,20).fill({color:0x10171a,alpha:.5});
   crate.position.set(box.x,box.y);app.renderer.render(app.stage);if(host.current)host.current.dataset.officeFrames=String(++frames);
  }
  const update=(f:OfficeFrame)=>{if(previous?.ticketId===f.ticketId&&previous.sequence===f.sequence)return;cancel();const animate=officeTransition(previous,f)&&!document.hidden,fromBuilder={...builder},fromBox={...box},toBuilder=f.alarm||f.dimmed?builder:builderPose(f),toBox=cratePose(f),newStamp=previous?.stamp!==f.stamp&&!!f.stamp;previous=f;
   if(!animate){builder={...toBuilder};box={...toBox};paint(f);return;}
   const spring=stationSpring(),start=performance.now();const tick=()=>{const sample=spring.next(performance.now()-start),v=sample.value;builder={x:fromBuilder.x+(toBuilder.x-fromBuilder.x)*v,y:fromBuilder.y+(toBuilder.y-fromBuilder.y)*v};box={x:fromBox.x+(toBox.x-fromBox.x)*v,y:fromBox.y+(toBox.y-fromBox.y)*v};paint(f,newStamp?1+.08*(1-v):1);if(!sample.done&&!document.hidden)raf=requestAnimationFrame(tick);else{raf=undefined;builder={...toBuilder};box={...toBox};}};tick();
  };
  function hide(){cancel();if(!latest.current.alarm&&!latest.current.dimmed)builder=builderPose(latest.current);box=cratePose(latest.current);if(!document.hidden)paint(latest.current);}
  document.addEventListener('visibilitychange',hide);owned.update=update;engine.current=owned;update(latest.current);
 })().catch(()=>{owned?.destroy();owned=null;if(!disposed)setFailed(true);});
 return()=>{disposed=true;engine.current=null;owned?.destroy();};
 },[theme]);
 useEffect(()=>{engine.current?.update(frame);},[frame]);
 return <><div className="office-canvas" ref={host}/>{failed&&<p role="status">The drawing is unavailable. The roles and recorded ticket remain accessible below.</p>}</>;
}

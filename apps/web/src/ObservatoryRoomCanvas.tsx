import {useEffect,useRef,useMemo} from 'react';
import {officeLight} from './office-light.ts';
import {officeFrame} from './office-model.ts';
import {officeActivity} from './office-activity.ts';
import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import {fuelFact,type Beat} from './observatory-room-model.ts';
// A display-only arrangement of the existing original room and character textures.
export function ObservatoryRoomCanvas({id,events,beat,theme,highlight,reduced,paused,hour}:{id:string;events:TicketEvent[];beat?:Beat|undefined;theme:'light'|'dark';highlight:string|null;reduced:boolean;paused:boolean;hour:number}){
 const facts=useMemo(()=>({frame:officeFrame(id,events),activity:officeActivity(id,events),fuel:fuelFact(events)}),[id,events]);
 const host=useRef<HTMLDivElement>(null),latest=useRef({id,events,beat,theme,highlight,reduced,paused,hour,...facts}),draw=useRef<(()=>void)|null>(null);latest.current={id,events,beat,theme,highlight,reduced,paused,hour,...facts};
 useEffect(()=>{let gone=false,destroy=()=>{};
  void(async()=>{const {Application,Container,Sprite,Texture,Rectangle,Graphics,Assets,EventsTicker,Ticker,RenderTexture}=await import('pixi.js');await import('pixi.js/unsafe-eval');
   const {AdvancedBloomFilter}=await import('../vendor/pixi-filters-6.1.5/lib/advanced-bloom/AdvancedBloomFilter.mjs');
   if(gone)return;const app=new Application();await app.init({width:960,height:248,autoStart:false,antialias:false,backgroundColor:0x252831,preference:'webgl'});if(gone){app.destroy(true);return;}
   Assets.setPreferences({preferWorkers:false});const textures=await Promise.all(['room-light','builder','grader','writer','owner','package'].map(name=>Assets.load('/workshop-pixel/'+name+'.png')));if(gone){app.destroy(true);return;}textures.forEach(t=>t.source.scaleMode='nearest');
   const world=new Container();app.stage.addChild(world);
   function crop(x:number,y:number,w:number,h:number,dx:number,dw:number){const t=new Texture({source:textures[0].source,frame:new Rectangle(x,y,w,h)}),s=new Sprite(t);s.position.set(dx,0);s.width=dw;s.height=248;world.addChild(s);}
   crop(5,4,291,194,0,445);crop(299,48,168,151,445,310);crop(313,193,156,88,755,205);
   const drawers=new Graphics().rect(292,8,130,42).fill(0x3e2731);for(let y=0;y<2;y++)for(let x=0;x<6;x++)drawers.rect(295+x*21,11+y*19,18,16).fill(0x733e39).rect(302+x*21,18+y*19,4,2).fill(0xe4a672);world.addChild(drawers);const bars=new Graphics();for(let x=80;x<=190;x+=22)bars.rect(x,9,3,40).fill(0x252831);world.addChild(bars);
   const edges=new Graphics().rect(441,0,4,248).fill(0x557b89).rect(753,0,4,248).fill(0x557b89);world.addChild(edges);
   const builderFrames=Array.from({length:12},(_,row)=>Array.from({length:4},(_,i)=>new Texture({source:textures[1].source,frame:new Rectangle(i*48,row*48,48,48)})));
   const sprites=textures.slice(1,5).map(t=>{const s=new Sprite(new Texture({source:t.source,frame:new Rectangle(0,0,48,48)}));s.anchor.set(.5,1);s.scale.set(1.65);world.addChild(s);return s;});
   const parcel=new Sprite(textures[5]);parcel.width=25;parcel.height=25;world.addChild(parcel);
   const gauge=new Graphics();world.addChild(gauge);const lightTexture=RenderTexture.create({width:960,height:248,resolution:1});lightTexture.source.scaleMode='nearest';const map=new Container(),ambient=new Graphics(),lights=new Graphics();map.addChild(ambient,lights);lights.blendMode='add';const shade=new Sprite(lightTexture);shade.blendMode='multiply';app.stage.addChild(shade);let lightPeriod='';const glow=new Graphics();glow.blendMode='add';glow.filters=[new AdvancedBloomFilter({threshold:.7,bloomScale:.12,brightness:1,blur:1,quality:1})];glow.filterArea=new Rectangle(0,0,960,248);app.stage.addChild(glow);const ring=new Graphics();app.stage.addChild(ring);
   host.current?.append(app.canvas);app.canvas.setAttribute('aria-hidden','true');EventsTicker.removeTickerListener();Ticker.system.stop();let raf=0,ambientTimer:ReturnType<typeof setTimeout>|undefined,blinkUntil=0,frames=0,lastRAF=0,frameTimes:number[]=[],lastSequence=0,from={x:170,y:209},position={...from},parcelFrom={x:570,y:210},parcelPosition={...parcelFrom},started=0;
   function render(){if(gone||document.hidden||latest.current.paused)return;const renderStart=performance.now(),p=latest.current,f=p.frame,a=p.activity,sequence=p.beat?.sequences.at(-1)??0;
    const target=a.action==='read'?{x:65,y:181}:a.action==='command'?{x:277,y:191}:f.phase==='checking'?{x:397,y:216}:{x:170,y:209};
    if(sequence!==lastSequence){from={...position};parcelFrom={...parcelPosition};started=performance.now();lastSequence=sequence;}
    const age=performance.now()-started,t=p.reduced||!p.beat||f.alarm||f.dimmed?1:Math.min(1,age/240),ease=1-(1-t)**3;position={x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease};
    const row=f.alarm?10:a.action==='type'?5:a.action==='read'?6:a.action==='frozen'?10:t<1?4:0,frame=t<1?Math.floor(age/75)%4:0;
    sprites[0]!.texture=builderFrames[row]![frame]!;sprites[0]!.position.set(position.x,position.y);sprites[1]!.position.set(625,213);sprites[2]!.position.set(360,107);sprites[2]!.scale.set(1.15);sprites[3]!.position.set(869,193);
    const reset=p.events.filter(e=>e.kind==='state_changed'&&['building','fixing'].includes(String(e.data.to))).at(-1)?.sequence??0,candidate=p.events.filter(e=>e.kind==='candidate_frozen'&&e.sequence>reset).at(-1),checked=candidate&&p.events.some(e=>e.kind==='check_result'&&e.sequence>candidate.sequence);parcel.visible=!!candidate;const parcelTarget=checked?{x:825,y:160}:{x:570,y:210};parcelPosition={x:parcelFrom.x+(parcelTarget.x-parcelFrom.x)*ease,y:parcelFrom.y+(parcelTarget.y-parcelFrom.y)*ease};parcel.position.set(parcelPosition.x,parcelPosition.y);
    const fuel=p.fuel;gauge.clear().rect(218,164,12,40).fill(0x252831).rect(221,167,6,34).fill(0x4b555f);if(fuel.percent!==null){const h=Math.round(34*Math.min(1,fuel.percent/100));gauge.rect(221,201-h,6,h).fill(0xfeae34);}
    const light=officeLight(p.hour);if(light.period!==lightPeriod){lightPeriod=light.period;ambient.clear().rect(0,0,960,248).fill(light.period==='night'?0x33304d:light.period==='evening'?0x9c716b:light.period==='morning'?0xf5d8b5:0xffefd8);lights.clear();
    const pool=(x:number,y:number,rx:number,ry:number,c:number)=>{for(let band=6;band>0;band--)lights.ellipse(x,y,Math.round(rx*band/6),Math.round(ry*band/6)).fill({color:c,alpha:(7-band)/32});};
    if(light.period==='night'||light.period==='evening'){for(let b=6;b>0;b--)lights.rect(448-b,55-b,299+b*2,184+b*2).fill({color:0xc0cbdc,alpha:.09});pool(620,140,135,100,0xc0cbdc);pool(190,140,100,85,0x2ce8f5);pool(862,127,70,95,0xfeae34);pool(360,80,55,80,0xfeae34);for(let b=0;b<5;b++)lights.poly([70+b*3,43,120+b*3,43,300-b*8,235,170+b*3,235]).fill({color:0x8b9bb4,alpha:.07});}
    else for(let b=0;b<5;b++)lights.poly([70+b*3,43,185-b*3,43,410-b*8,245,250+b*3,245]).fill({color:0xfeae34,alpha:.045});app.renderer.render({container:map,target:lightTexture,clear:true});}
    
    glow.clear();for(const [x,y,c] of [[180,144,0x2ce8f5],[620,136,0xa6e7f2],[862,105,0xfeae34]] as const)for(let b=4;b>0;b--)glow.ellipse(x,y,12*b,8*b).fill({color:c,alpha:light.period==='night'?.08:.015});
    glow.rect(173,126,28,15).fill(0x124e89).rect(612,125,28,15).fill(0x124e89);for(const x of [176,615])for(let j=0;j<3;j++)glow.rect(x,130+j*3,12,1).fill(0x2ce8f5);if(a.tests){for(let i=0;i<8;i++)glow.rect(535+i*18,27,7,12).fill(i<Math.floor(a.tests.passed/a.tests.total*8)?0x63c74d:a.tests.failed&&i===7?0xe43b44:0x3a4466);}
    if(f.dimmed)glow.rect(0,0,960,248).fill({color:0x15191d,alpha:.65});if(f.alarm)glow.rect(430,0,4,248).fill(0xe43b44);if(performance.now()<blinkUntil){glow.rect(position.x-8,position.y-53,16,3).fill(0x252831);}
    if(f.stamp){const color=f.stamp==='checked'?0x63c74d:f.stamp==='look closer'?0xfeae34:0xe43b44;glow.circle(866,151,7).fill({color,alpha:f.sealed?1:.45});if(p.beat?.station==='seal'&&age<240&&!p.reduced)glow.circle(866,151,12).fill({color:0xead4aa,alpha:(1-t)*.6});}
    ring.clear();const areas:Record<string,[number,number,number,number]>={net:[49,7,162,43],paths:[291,7,132,44],fuel:[213,150,29,50],grader:[447,2,305,242],seal:[803,94,135,124]};if(p.highlight&&areas[p.highlight]){const [x,y,w,h]=areas[p.highlight]!;ring.roundRect(x,y,w,h,4).stroke({color:0x9ec6ff,width:3});}
    const moving=(t<1||performance.now()<blinkUntil)&&!p.reduced,now=performance.now();if(moving){if(lastRAF)frameTimes.push(now-lastRAF);lastRAF=now;}else if(lastRAF){if(host.current)host.current.dataset.intervals=JSON.stringify(frameTimes.slice(-120));frameTimes=[];lastRAF=0;}app.render();frames++;if(host.current){host.current.dataset.frames=String(frames);host.current.dataset.drawMs=(performance.now()-renderStart).toFixed(2);host.current.dataset.animating=String(moving);host.current.dataset.light=light.period;}if(host.current){host.current.dataset.sequence=String(f.sequence);host.current.dataset.motionSequence=String(sequence);host.current.dataset.phase=f.phase;host.current.dataset.builder=JSON.stringify(position);host.current.dataset.idle=String(t===1);}
    // No ambient loop: a new event gets one finite movement, then rendering stops.
    cancelAnimationFrame(raf);if((t<1||performance.now()<blinkUntil)&&!p.reduced)raf=requestAnimationFrame(render);else if(a.action==='idle'&&!p.reduced&&!f.alarm&&!f.dimmed){clearTimeout(ambientTimer);ambientTimer=setTimeout(()=>{blinkUntil=performance.now()+120;render();},8000);}
   }
   const visibility=()=>{cancelAnimationFrame(raf);clearTimeout(ambientTimer);if(!document.hidden&&!latest.current.paused)render();};document.addEventListener('visibilitychange',visibility);draw.current=()=>{cancelAnimationFrame(raf);clearTimeout(ambientTimer);render();};render();destroy=()=>{cancelAnimationFrame(raf);clearTimeout(ambientTimer);document.removeEventListener('visibilitychange',visibility);lightTexture.destroy(true);app.destroy(true,{children:true,texture:false});};
  })().catch(()=>{if(host.current)host.current.textContent='The room could not render. Task records are still available below.';});
  return()=>{gone=true;draw.current=null;destroy();};
 },[]);
 useEffect(()=>{draw.current?.();},[events,beat,theme,highlight,reduced,paused,hour]);
 return <div ref={host} className="obs2-room-canvas" role="img" aria-label="Original Workshop: Builder outside the glass inspection lab, Test Writer at a side desk, your stamp desk on the right"/>;
}

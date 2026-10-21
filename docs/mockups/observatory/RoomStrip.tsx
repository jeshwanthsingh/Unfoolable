import {useEffect,useRef} from 'react';
import {officeFrame} from '../../../apps/web/src/office-model.ts';
import {officeActivity} from '../../../apps/web/src/office-activity.ts';
import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import {fuelFact,type Beat} from './model.ts';
// A display-only arrangement of the existing original room and character textures.
export function RoomStrip({id,events,beat,theme,highlight,reduced}:{id:string;events:TicketEvent[];beat?:Beat|undefined;theme:'light'|'dark';highlight:string|null;reduced:boolean}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({id,events,beat,theme,highlight,reduced}),draw=useRef<(()=>void)|null>(null);latest.current={id,events,beat,theme,highlight,reduced};
 useEffect(()=>{let gone=false,destroy=()=>{};
  void(async()=>{const {Application,Container,Sprite,Texture,Rectangle,Graphics,Assets,EventsTicker,Ticker}=await import('pixi.js');await import('pixi.js/unsafe-eval');
   const {AdvancedBloomFilter}=await import('../../../apps/web/vendor/pixi-filters-6.1.5/lib/advanced-bloom/AdvancedBloomFilter.mjs');
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
   const gauge=new Graphics();world.addChild(gauge);const tone=new Graphics();app.stage.addChild(tone);const glow=new Graphics();glow.blendMode='add';glow.filters=[new AdvancedBloomFilter({threshold:.7,bloomScale:.12,brightness:1,blur:1,quality:1})];glow.filterArea=new Rectangle(0,0,960,248);app.stage.addChild(glow);const ring=new Graphics();app.stage.addChild(ring);
   host.current?.append(app.canvas);app.canvas.setAttribute('aria-hidden','true');EventsTicker.removeTickerListener();Ticker.system.stop();let raf=0,lastSequence=0,from={x:170,y:209},position={...from},started=0;
   function render(){if(gone||document.hidden)return;const p=latest.current,f=officeFrame(p.id,p.events),a=officeActivity(p.id,p.events),sequence=p.beat?.sequences.at(-1)??0;
    const target=a.action==='read'?{x:65,y:181}:a.action==='command'?{x:277,y:191}:f.phase==='checking'?{x:417,y:216}:{x:170,y:209};
    if(sequence!==lastSequence){from={...position};started=performance.now();lastSequence=sequence;}
    const age=performance.now()-started,t=p.reduced?1:Math.min(1,age/240),ease=1-(1-t)**3;position={x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease};
    const row=a.action==='type'?5:a.action==='read'?6:a.action==='frozen'?10:t<1?4:0,frame=t<1?Math.floor(age/75)%4:0;
    sprites[0]!.texture=builderFrames[row]![frame]!;sprites[0]!.position.set(position.x,position.y);sprites[1]!.position.set(625,213);sprites[2]!.position.set(360,107);sprites[2]!.scale.set(1.15);sprites[3]!.position.set(869,193);
    parcel.visible=p.events.some(e=>e.kind==='candidate_frozen');parcel.position.set(f.phase==='checking'?570:825,f.phase==='checking'?210:160);
    const fuel=fuelFact(p.events);gauge.clear().rect(218,164,12,40).fill(0x252831).rect(221,167,6,34).fill(0x4b555f);if(fuel.percent!==null){const h=Math.round(34*Math.min(1,fuel.percent/100));gauge.rect(221,201-h,6,h).fill(0xfeae34);}
    tone.clear();if(p.theme==='dark')tone.rect(0,0,960,248).fill({color:0x15152d,alpha:.48});
    glow.clear();for(const [x,y,c] of [[180,144,0x2ce8f5],[620,136,0xa6e7f2],[862,105,0xfeae34]] as const)for(let b=4;b>0;b--)glow.ellipse(x,y,12*b,8*b).fill({color:c,alpha:p.theme==='dark'?.055:.014});
    if(f.stamp){const color=f.stamp==='checked'?0x63c74d:f.stamp==='look closer'?0xfeae34:0xe43b44;glow.circle(866,151,7).fill({color,alpha:f.sealed?1:.45});if(p.beat?.station==='seal'&&age<240&&!p.reduced)glow.circle(866,151,12).fill({color:0xead4aa,alpha:(1-t)*.6});}
    ring.clear();const areas:Record<string,[number,number,number,number]>={net:[49,7,162,43],secrets:[291,7,132,44],fuel:[213,150,29,50],grader:[447,2,305,242],seal:[803,94,135,124]};if(p.highlight&&areas[p.highlight]){const [x,y,w,h]=areas[p.highlight]!;ring.roundRect(x,y,w,h,4).stroke({color:0x9ec6ff,width:3});}
    app.render();if(host.current){host.current.dataset.sequence=String(sequence);host.current.dataset.phase=f.phase;host.current.dataset.builder=JSON.stringify(position);host.current.dataset.idle=String(t===1);}
    // No ambient loop: a new event gets one finite movement, then rendering stops.
    cancelAnimationFrame(raf);if(t<1&&!p.reduced)raf=requestAnimationFrame(render);
   }
   const visibility=()=>{cancelAnimationFrame(raf);if(!document.hidden)render();};document.addEventListener('visibilitychange',visibility);draw.current=()=>render();render();destroy=()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);app.destroy(true,{children:true,texture:false});};
  })().catch(()=>{if(host.current)host.current.textContent='The room could not render. Task records are still available below.';});
  return()=>{gone=true;draw.current=null;destroy();};
 },[]);
 useEffect(()=>{draw.current?.();},[events,beat,theme,highlight,reduced]);
 return <div ref={host} className="obs-room-canvas" role="img" aria-label="Original Workshop: Builder outside the glass inspection lab, Test Writer at a side desk, your stamp desk on the right"/>;
}

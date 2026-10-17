import {useEffect,useRef,useState} from 'react';
import {stations,type WorkshopTicket} from '../../../packages/shared/workshop.ts';
// Pixi is dynamically imported only on wide screens. No ticker remains active at rest.
export function WorkshopRoom({tickets,selected,onSelect,onStation}:{tickets:{title:string;state:WorkshopTicket}[];selected:string|null;onSelect:(id:string)=>void;onStation:(station:number)=>void}){
 const host=useRef<HTMLDivElement>(null),previous=useRef(new Map<string,{x:number;y:number}>()),[error,setError]=useState(false);
 useEffect(()=>{if(!host.current)return;let disposed=false,destroy:(()=>void)|undefined;
 void (async()=>{const {Application,Graphics,Text,Sprite,Assets,EventsTicker,Ticker}=await import('pixi.js');if(disposed)return;
  const app=new Application();await app.init({width:900,height:590,backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl'});
  if(disposed){app.destroy(true,{children:true});return;}destroy=()=>{app.stop();app.destroy(true,{children:true,texture:false});};// Static objects use native pointer events; Pixi's synthetic stationary-pointer ticker is unnecessary.
  EventsTicker.removeTickerListener();Ticker.system.stop();host.current!.replaceChildren(app.canvas);app.canvas.setAttribute('aria-hidden','true');
  const positions=[[135,155],[445,155],[755,155],[600,415],[270,415]] as const;
  const brass=0xbba073,ink=0x242b2c;
  const floor=new Graphics().roundRect(24,35,852,510,22).fill(0x1a2021).stroke({color:0x49483e,width:2});app.stage.addChild(floor);
  const grid=new Graphics();for(let x=45;x<865;x+=40)grid.moveTo(x,50).lineTo(x,530);for(let y=55;y<540;y+=40)grid.moveTo(40,y).lineTo(860,y);grid.stroke({color:0x333a37,width:1,alpha:.42});app.stage.addChild(grid);
  const pipe=new Graphics();positions.forEach(([x,y],i)=>i?pipe.lineTo(x,y):pipe.moveTo(x,y));pipe.stroke({color:0x74674b,width:10,alpha:.4});app.stage.addChild(pipe);
  const label=(text:string,x:number,y:number,size=17,color=0xe4dccc)=>{const t=new Text({text,style:{fontFamily:'system-ui',fontSize:size,fill:color,fontWeight:'500'}});t.anchor.set(.5);t.position.set(x,y);app.stage.addChild(t);return t;};
  positions.forEach(([x,y],i)=>{const g=new Graphics().roundRect(x-105,y-62,210,125,10).fill(ink).stroke({color:brass,width:2});g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>onStation(i));app.stage.addChild(g);label(String(i+1).padStart(2,'0'),x-75,y-38,12,brass);label(stations[i]!,x,y-26);const icon=new Graphics();
   if(i===2){icon.circle(x,y+15,29).fill(0x151d20).stroke({color:brass,width:3}).circle(x,y+15,20).stroke({color:0x737b6b,width:1}).moveTo(x-12,y+15).lineTo(x+12,y+15).moveTo(x,y+3).lineTo(x,y+27).stroke({color:brass,width:3});}
   else if(i===0){icon.roundRect(x-39,y+2,78,32,3).fill(0x3c4139).stroke({color:brass,width:1}).moveTo(x-26,y+12).lineTo(x+26,y+12).moveTo(x-26,y+20).lineTo(x+10,y+20).stroke({color:0x98967b,width:2});}
   else{icon.roundRect(x-56,y+4,112,12,3).fill(0x856e48).stroke({color:brass,width:1}).rect(x-47,y+16,6,26).rect(x+41,y+16,6,26).fill(0x5a5d4b);if(i===4)icon.roundRect(x-18,y-8,36,22,2).fill(0x171f23).stroke({color:brass,width:2});else icon.moveTo(x-22,y-6).lineTo(x-10,y+4).moveTo(x+10,y-9).lineTo(x+26,y+4).stroke({color:0xaaa78d,width:5});}app.stage.addChild(icon);});
  const texture=await Assets.load('/workshop/crate_E.png');if(disposed)return;
  const moves:{sprite:InstanceType<typeof Sprite>;from:{x:number;y:number};to:{x:number;y:number}}[]=[];
  tickets.forEach(({title,state},index)=>{const [x,y]=positions[state.station]!,same=tickets.slice(0,index).filter(t=>t.state.station===state.station).length,to={x:x-70+(same%4)*45,y:y+65+Math.floor(same/4)*17};
   const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.width=38;sprite.height=40;sprite.tint=state.id===selected?0xffd99b:0xbda77b;sprite.eventMode='static';sprite.cursor='pointer';sprite.on('pointertap',()=>onSelect(state.id));app.stage.addChild(sprite);
   const from=previous.current.get(state.id)??to;sprite.position.set(from.x,from.y);moves.push({sprite,from,to});previous.current.set(state.id,to);
   label(state.id.slice(0,4),to.x,to.y+25,9);if(state.id===selected){label(title.slice(0,46),450,568,13);}
  });
  const active=tickets.find(t=>['working','blocked'].includes(t.state.agent))??tickets.find(t=>t.state.id===selected)??tickets.find(t=>t.state.agent==='needs you');
  if(active){const [x,y]=positions[active.state.station]!,bot=new Graphics().roundRect(x+64,y-52,25,25,7).fill(active.state.agent==='blocked'?0xb97c51:0x9caeaa).stroke({color:brass,width:2}).circle(x+71,y-42,2).circle(x+82,y-42,2).fill(0x1a2021);app.stage.addChild(bot);if(active.state.agent==='needs you')app.stage.addChild(new Graphics().roundRect(x-48,y-103,96,24,7).fill(0x454331).stroke({color:brass,width:1}));label(active.state.agent+(active.state.blocked?' · '+active.state.blocked+' blocked':''),x,y-88,12,0xddd0b3);}
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)'),reduced=motionQuery.matches;let started=performance.now();
  const render=()=>{const t=motionQuery.matches?1:Math.min(1,(performance.now()-started)/600);for(const m of moves)m.sprite.position.set(m.from.x+(m.to.x-m.from.x)*t,m.from.y+(m.to.y-m.from.y)*t);app.renderer.render(app.stage);if(t>=1){app.ticker.stop();Ticker.system.stop();}};
  app.ticker.add(render);render();if(!document.hidden&&!reduced&&moves.some(m=>m.from.x!==m.to.x||m.from.y!==m.to.y))app.start();
  const visibility=()=>{app.stop();Ticker.system.stop();if(!document.hidden){started=performance.now()-600;render();}};document.addEventListener('visibilitychange',visibility);const motionChanged=()=>{if(motionQuery.matches){app.stop();started=performance.now()-600;render();}};motionQuery.addEventListener('change',motionChanged);
  destroy=()=>{document.removeEventListener('visibilitychange',visibility);motionQuery.removeEventListener('change',motionChanged);app.stop();app.destroy(true,{children:true,texture:false});};
 })().catch(()=>{if(!disposed)setError(true);});return()=>{disposed=true;destroy?.();};
 },[tickets,selected,onSelect,onStation]);
 return <><div className="workshop-canvas" ref={host}/>{error&&<p role="status">Canvas unavailable. All tickets and stations remain available below.</p>}</>;
}

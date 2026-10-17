import {useEffect,useRef,useState} from 'react';
import {stations,type WorkshopTicket} from '../../../packages/shared/workshop.ts';
// Pixi is dynamically imported only on wide screens. No ticker remains active at rest.
export function WorkshopRoom({tickets,selected,onSelect,onStation}:{tickets:{title:string;state:WorkshopTicket}[];selected:string|null;onSelect:(id:string)=>void;onStation:(station:number)=>void}){
 const host=useRef<HTMLDivElement>(null),previous=useRef(new Map<string,{x:number;y:number}>()),[error,setError]=useState(false);
 useEffect(()=>{if(!host.current)return;let disposed=false,destroy:(()=>void)|undefined;
 void (async()=>{const {Application,Graphics,Text,Sprite,Assets}=await import('pixi.js');if(disposed)return;
  const app=new Application();await app.init({width:900,height:590,backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl'});
  if(disposed){app.destroy(true,{children:true});return;}host.current!.replaceChildren(app.canvas);app.canvas.setAttribute('aria-hidden','true');
  const positions=[[135,155],[445,155],[755,155],[600,415],[270,415]] as const;
  const brass=0xbba073,ink=0x242b2c;
  const floor=new Graphics().roundRect(24,35,852,510,22).fill(0x1a2021).stroke({color:0x49483e,width:2});app.stage.addChild(floor);
  const grid=new Graphics();for(let x=45;x<865;x+=40)grid.moveTo(x,50).lineTo(x,530);for(let y=55;y<540;y+=40)grid.moveTo(40,y).lineTo(860,y);grid.stroke({color:0x333a37,width:1,alpha:.42});app.stage.addChild(grid);
  const pipe=new Graphics();positions.forEach(([x,y],i)=>i?pipe.lineTo(x,y):pipe.moveTo(x,y));pipe.stroke({color:0x74674b,width:10,alpha:.4});app.stage.addChild(pipe);
  const label=(text:string,x:number,y:number,size=17,color=0xe4dccc)=>{const t=new Text({text,style:{fontFamily:'system-ui',fontSize:size,fill:color,fontWeight:'500'}});t.anchor.set(.5);t.position.set(x,y);app.stage.addChild(t);return t;};
  positions.forEach(([x,y],i)=>{const g=new Graphics().roundRect(x-105,y-62,210,125,10).fill(ink).stroke({color:brass,width:2});g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>onStation(i));app.stage.addChild(g);label(String(i+1).padStart(2,'0'),x-75,y-38,12,brass);label(stations[i]!,x,y-7);label(i===2?'PROTECTED':'STATION',x,y+27,10,0x9b9d91);});
  const texture=await Assets.load('/workshop/crate_E.png');if(disposed)return;
  const moves:{sprite:InstanceType<typeof Sprite>;from:{x:number;y:number};to:{x:number;y:number}}[]=[];
  tickets.forEach(({title,state},index)=>{const [x,y]=positions[state.station]!,same=tickets.slice(0,index).filter(t=>t.state.station===state.station).length,to={x:x-70+(same%4)*45,y:y+65+Math.floor(same/4)*31};
   const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.width=40;sprite.height=43;sprite.tint=state.id===selected?0xffd99b:0xbda77b;sprite.eventMode='static';sprite.cursor='pointer';sprite.on('pointertap',()=>onSelect(state.id));app.stage.addChild(sprite);
   const from=previous.current.get(state.id)??to;sprite.position.set(from.x,from.y);moves.push({sprite,from,to});previous.current.set(state.id,to);
   label(state.id.slice(0,4),to.x,to.y+25,9);if(state.id===selected){label(title.slice(0,46),450,568,13);}
  });
  const active=tickets.find(t=>['working','blocked'].includes(t.state.agent))??tickets.find(t=>t.state.id===selected);
  if(active){const [x,y]=positions[active.state.station]!,bot=new Graphics().roundRect(x+64,y-52,25,25,7).fill(active.state.agent==='blocked'?0xb97c51:0x9caeaa).stroke({color:brass,width:2}).circle(x+71,y-42,2).circle(x+82,y-42,2).fill(0x1a2021);app.stage.addChild(bot);label(active.state.agent+(active.state.blocked?' · '+active.state.blocked+' blocked':''),x,y-88,12,0xddd0b3);}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let started=performance.now();
  const render=()=>{const t=reduced?1:Math.min(1,(performance.now()-started)/600);for(const m of moves)m.sprite.position.set(m.from.x+(m.to.x-m.from.x)*t,m.from.y+(m.to.y-m.from.y)*t);app.renderer.render(app.stage);if(t>=1)app.ticker.stop();};
  app.ticker.add(render);render();if(!document.hidden&&!reduced)app.start();
  const visibility=()=>{app.stop();if(!document.hidden){started=performance.now()-600;render();}};document.addEventListener('visibilitychange',visibility);
  destroy=()=>{document.removeEventListener('visibilitychange',visibility);app.stop();app.destroy(true,{children:true,texture:false});};
 })().catch(()=>{if(!disposed)setError(true);});return()=>{disposed=true;destroy?.();};
 },[tickets,selected,onSelect,onStation]);
 return <><div className="workshop-canvas" ref={host}/>{error&&<p role="status">Canvas unavailable. All tickets and stations remain available below.</p>}</>;
}

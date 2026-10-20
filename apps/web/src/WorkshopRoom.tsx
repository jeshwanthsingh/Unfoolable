import type {Texture as PixiTexture} from 'pixi.js';
import {useEffect,useRef,useState} from 'react';
import {officeTransition,type OfficeFrame,type OfficeRole} from './office-model.ts';
import {officeClick} from './office-sound.ts';
import {workshopRoute,type OfficeActivity} from './office-activity.ts';
import {workshopLighting} from './office-lighting.ts';
import {safetyObjectAt,protectionProbe,type SafetyObject} from './office-safety.ts';
type Props={frame:OfficeFrame;theme:'light'|'dark';activity?:OfficeActivity;onCanvas?:(canvas:HTMLCanvasElement|null)=>void;sound?:boolean;replay?:boolean;playing?:boolean;onRole?:(role:OfficeRole)=>void;onObject?:(object:SafetyObject)=>void;title?:string;recordSize?:'landscape'|'portrait'|null;fuel?:{used:number|null;limit:number}|null};
const poses=['idle','walk-down','walk-up','walk-left','walk-right','type','read','carry','celebrate','worried','frozen','wave'];
export function WorkshopRoom(props:Props){
 const {theme,onCanvas}=props,host=useRef<HTMLDivElement>(null),latest=useRef(props),engine=useRef<{update:()=>void;destroy:()=>void}|null>(null),[failed,setFailed]=useState(false);latest.current=props;
 useEffect(()=>{if(!host.current)return;let disposed=false,owned:{update:()=>void;destroy:()=>void}|null=null;
 void(async()=>{
  const {Application,Container,Sprite,Texture,Rectangle,Graphics,Assets,Text,EventsTicker,Ticker}=await import('pixi.js');if(disposed)return;
  const app=new Application();await app.init({width:960,height:576,backgroundColor:0x181425,antialias:false,autoStart:false,preference:'webgl',resolution:1});if(disposed){app.destroy(true,{children:true});return;}
  let provisionalDestroyed=false;owned={update:()=>{},destroy:()=>{if(!provisionalDestroyed){provisionalDestroyed=true;app.destroy(true,{children:true,texture:false});}}};
  let raf:number|undefined,dead=false,frames=0,elapsed=0,movie=0,last=0,renderedAt=0,previous:OfficeFrame|null=null,previousActivity=-1,previousReplay=false,effectAt=-100,packagePosition={x:157,y:180},packageRoute:{x:number;y:number}[]=[],paintTotal=0,first=true,route:{x:number;y:number}[]=[],position={x:110,y:168},camera={x:240,y:144,z:1},payoff=false;
  const world=new Container();app.stage.addChild(world);const sky=new Graphics();world.addChild(sky);
  const textures=await Promise.all(['room-light','builder','grader','writer','owner','package'].map(x=>Assets.load<PixiTexture>('/workshop-pixel/'+x+'.png')));
  if(disposed){owned.destroy();return;}for(const t of textures)t.source.scaleMode='nearest';
  world.addChild(new Sprite(textures[0]));const shadows=new Graphics();world.addChild(shadows);
  const spriteFrames=textures.slice(1,5).map(t=>poses.map((_,row)=>Array.from({length:4},(_,f)=>new Texture({source:t.source,frame:new Rectangle(f*48,row*48,48,48)}))));
  const actors=spriteFrames.map(rows=>{const s=new Sprite(rows[0]![0]);s.anchor.set(.5,1);world.addChild(s);return s;});actors[1]!.position.set(390,155);actors[2]!.position.set(245,97);actors[3]!.position.set(367,259);
  const pet=new Graphics(),objects=new Graphics();world.addChild(pet,objects);
  const parcel=new Sprite(textures[5]);parcel.anchor.set(.5,.8);parcel.width=24;parcel.height=24;world.addChild(parcel);
  const lighting=workshopLighting(app);world.addChild(lighting.shade,lighting.emission);
  const fx=new Graphics(),clock=new Graphics();world.addChild(fx,clock);
  const backing=new Graphics(),bubble=new Text({text:'',style:{fontFamily:'Instrument Sans,system-ui,sans-serif',fontSize:7,fontWeight:'600',fill:'#181425',wordWrap:true,wordWrapWidth:116}});bubble.resolution=2;bubble.anchor.set(.5,1);world.addChild(backing,bubble);

  const plate=new Graphics(),caption=new Text({text:'',style:{fontFamily:'Instrument Sans,system-ui,sans-serif',fontSize:24,fontWeight:'600',fill:'#ead4aa',wordWrap:true,wordWrapWidth:1000}});caption.resolution=2;caption.anchor.set(.5);app.stage.addChild(plate,caption);
  app.stage.eventMode='none';EventsTicker.removeTickerListener();Ticker.system.stop();host.current!.replaceChildren(app.canvas);app.canvas.setAttribute('aria-hidden','true');onCanvas?.(app.canvas);
  const cancel=()=>{if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;last=0;};
  function destroy(){if(dead)return;dead=true;cancel();document.removeEventListener('visibilitychange',visibility);app.canvas.removeEventListener('pointerup',hit);if(host.current?.contains(app.canvas))onCanvas?.(null);app.destroy(true,{children:true,texture:false});lighting.destroy();}
  function setPose(i:number,name:string,n:number){actors[i]!.texture=spriteFrames[i]![Math.max(0,poses.indexOf(name))]![n%4]!;}
  function update(){const {frame:f,activity:a,replay}=latest.current,changed=officeTransition(previous,f),reset=!!previous&&f.sequence<previous.sequence;
   if(reset){first=true;effectAt=-100;movie=0;payoff=false;}if(!!replay!==previousReplay){movie=0;payoff=false;previousReplay=!!replay;}
   if(changed&&f.stamp&&f.stamp!==previous?.stamp){effectAt=elapsed;host.current?.setAttribute('data-result-event',String(f.motionSequence));if(latest.current.sound)officeClick();}
   if(a?.sequence!==previousActivity||f.phase!==previous?.phase){const steps=workshopRoute(a?.action??'idle');route=[{x:position.x,y:168},...steps];if(first){position={...steps.at(-1)!};route=[];}previousActivity=a?.sequence??-1;}
   if(first||f.phase!==previous?.phase){const end=f.phase==='checking'?{x:326,y:158}:['ready_for_review','kept','discarded'].includes(f.phase)?{x:393,y:225}:{x:157,y:180};packageRoute=first?[]:f.phase==='checking'?[{x:232,y:180},{x:232,y:158},end]:[{x:300,y:158},{x:300,y:203},{x:393,y:203},end];if(first)packagePosition={...end};}
   previous=f;first=false;if(!document.hidden&&raf===undefined)raf=requestAnimationFrame(tick);
  }
  function paint(dt:number){const started=performance.now(),p=latest.current,{frame:f,activity:a}=p,now=new Date(),light=lighting.paint(now.getHours(),elapsed,a,f.alarm),night=light.period==='night';
   const targetWidth=p.recordSize==='landscape'?1920:p.recordSize==='portrait'?1080:host.current!.clientWidth,targetHeight=p.recordSize==='landscape'?1080:p.recordSize==='portrait'?1920:host.current!.clientHeight;if(app.screen.width!==targetWidth||app.screen.height!==targetHeight)app.renderer.resize(targetWidth,targetHeight);
   host.current?.setAttribute('data-light-period',light.period);
   sky.clear().rect(41,19,99,23).fill(light.sky);if(night)sky.rect(121,23,5,5).fill(0xc0cbdc).rect(56,23,1,1).rect(101,33,1,1).fill(0xead4aa);else sky.rect(119,22,7,7).fill(0xfee761).rect(48,32,18,2).fill(0xead4aa);
   shadows.clear();for(const actor of actors)shadows.ellipse(actor.x,actor.y-2,13,4).fill({color:0x181425,alpha:.38});for(const [x,y,w] of [[78,145,68],[217,86,56],[356,147,68],[338,250,94]])shadows.ellipse(x!+w!/2,y!,w!/2,5).fill({color:0x181425,alpha:.22});
   const action=a?.action??'idle',freeze=f.alarm||f.dimmed||action==='stopped',next=route[0],dx=next?next.x-position.x:0,dy=next?next.y-position.y:0,distance=Math.hypot(dx,dy),walk=!!next&&!freeze;
   if(walk&&distance<1){position={...next!};route.shift();}else if(walk){const step=Math.min(distance,dt*70);position.x+=dx/distance*step;position.y+=dy/distance*step;}
   const k=Math.floor(elapsed*6)%4,idleFrame=elapsed%5>4.84?3:Math.floor(elapsed/1.4)%2;let pose=action==='type'?'type':action==='read'?'read':action==='frozen'?'frozen':action==='inspect'?['idle','wave','read','idle'][Math.floor(elapsed/3)%4]!:'idle';
   if(walk)pose=Math.abs(dx)>Math.abs(dy)?dx<0?'walk-left':'walk-right':dy<0?'walk-up':'walk-down';if(f.alarm)pose='frozen';if(f.phase==='needs_you'&&!f.alarm)pose='worried';if(f.stamp==='checked'&&elapsed-effectAt>=0&&elapsed-effectAt<.7&&!freeze)pose='celebrate';
   setPose(0,pose,freeze?0:pose==='idle'?idleFrame:k);actors[0]!.position.set(Math.round(position.x),Math.round(position.y));setPose(1,f.activeRole==='grader'?'type':'idle',f.activeRole==='grader'?k:idleFrame);setPose(2,'idle',idleFrame);setPose(3,'idle',idleFrame);
   // Decorative pet and leaf motion cannot move a ticket or imply work.
   const catX=80+Math.round((Math.sin(elapsed*.11)+1)*36),catY=253;pet.clear().ellipse(catX,catY+4,8,2).fill({color:0x181425,alpha:.3}).roundRect(catX-7,catY-4,13,7,2).fill(0xe4a672).rect(catX+3,catY-7,7,6).fill(0xead4aa).poly([catX+3,catY-7,catX+3,catY-10,catX+6,catY-7]).fill(0xe4a672).rect(catX+7,catY-6,1,1).fill(0x181425);pet.moveTo(catX-7,catY-2).lineTo(catX-10,catY-5).stroke({color:0xe4a672,width:2});
   pet.rect(20,177,4,7).fill(0x265c42).ellipse(23+Math.round(Math.sin(elapsed*.45)),174,5,2).fill(0x3e8948);
   if(p.replay&&movie>=34&&f.stamp&&!payoff){payoff=true;packageRoute=[{x:393,y:225}];effectAt=elapsed+.55;}
   const pt=packageRoute[0];if(pt&&!freeze){const px=pt.x-packagePosition.x,py=pt.y-packagePosition.y,len=Math.hypot(px,py),step=Math.min(len,dt*110);if(len<1){packagePosition={...pt};packageRoute.shift();}else{packagePosition.x+=px/len*step;packagePosition.y+=py/len*step;}}
   parcel.visible=!!f.ticketId&&f.sequence>0;parcel.position.set(Math.round(packagePosition.x),Math.round(packagePosition.y));
   objects.clear();for(const x of [57,73,105,122])objects.rect(x,19,2,24).fill(0x262b44);objects.rect(42,29,97,2).fill(0x5a6988);
   objects.rect(205,220,74,43).fill(0x3e2731);for(let y=0;y<3;y++)for(let x=0;x<6;x++)objects.rect(208+x*11,223+y*12,9,10).fill(0x733e39).rect(211+x*11,227+y*12,3,1).fill(protectionProbe.count===null?0x5a6988:0xe4a672);

   objects.rect(149,119,11,20).fill(0x181425).rect(151,121,7,16).fill(0x3a4466);if(p.fuel?.used!==null&&p.fuel?.used!==undefined){const fill=Math.min(1,p.fuel.used/p.fuel.limit);objects.rect(151,137-Math.round(fill*16),7,Math.round(fill*16)).fill(fill>.9?0xe43b44:0xfeae34);}
   objects.roundRect(296,151,9,10,1).fill(0xfeae34).moveTo(297,151).lineTo(297,147).bezierCurveTo(297,143,303,143,303,147).lineTo(303,151).stroke({color:0xead4aa,width:2}).rect(300,155,1,3).fill(0x181425);
   objects.rect(457,199,12,31).fill(0x262b44).rect(459,201,8,27).fill(0x733e39).moveTo(463,219).lineTo(463,205).stroke({color:0xc0cbdc,width:2}).circle(463,204,4).fill(0xe43b44);
   for(let y=115;y<=179;y+=16)objects.moveTo(283,y).lineTo(292,y+6).stroke({color:f.alarm?0xe43b44:0xb55088,alpha:f.alarm?.9:.18,width:1});
   clock.clear();for(const h of [{a:(now.getHours()%12+now.getMinutes()/60)*Math.PI/6,l:5},{a:now.getMinutes()*Math.PI/30,l:7}])clock.moveTo(205,30).lineTo(205+Math.sin(h.a)*h.l,30-Math.cos(h.a)*h.l).stroke({width:1,color:0x181425});
   const glyphs:Record<string,string[]>={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],'-':['000','000','111','000','000'],'p':['000','110','101','110','100'],'a':['000','110','001','111','111'],'t':['010','111','010','010','011'],'h':['100','100','110','101','101'],'s':['000','111','110','011','111'],'?':['111','001','010','000','010']};
   for(const [text,y] of [[protectionProbe.count===null?'?':protectionProbe.count+' paths',246],[protectionProbe.date??'?',255]] as const)for(let i=0;i<text.length;i++)for(const [row,bits] of (glyphs[text[i]!]??[]).entries())for(let col=0;col<3;col++)if(bits[col]==='1')clock.rect(212+i*4+col,y+row,1,1).fill(0xead4aa);
   backing.clear();bubble.text=a?.bubble||(a?.writer==='preparing'?'Preparing test session':f.phase==='needs_you'?'Needs you':'');const talk=a?.bubble&&a.action==='inspect'?{x:390,y:155}:position;bubble.position.set(Math.round(talk.x),talk.y-50);if(bubble.text)backing.roundRect(bubble.x-bubble.width/2-5,bubble.y-bubble.height-4,bubble.width+10,bubble.height+8,2).fill(0xead4aa).stroke({color:0x733e39,width:1});
   const stamp=f.stamp,age=elapsed-effectAt;fx.clear();if(stamp){const x=393,y=225,c=stamp==='checked'?0x63c74d:stamp==='look closer'?0xfeae34:0xe43b44;fx.circle(x,y,8).fill(c);if(stamp==='checked')fx.moveTo(x-4,y).lineTo(x-1,y+3).lineTo(x+5,y-4).stroke({color:0x181425,width:2});else if(stamp==='look closer')fx.circle(x-1,y-1,3).stroke({color:0x181425,width:1}).moveTo(x+1,y+1).lineTo(x+4,y+4).stroke({color:0x181425,width:1});else fx.moveTo(x-3,y-3).lineTo(x+3,y+3).moveTo(x+3,y-3).lineTo(x-3,y+3).stroke({color:0x181425,width:2});
    if(age>=0&&age<.18){const press=1-Math.exp(-age*40),sy=196+press*20;fx.rect(x-4,sy-10,8,10).fill(0xfeae34).rect(x-11,sy,22,5).fill(0x733e39);}if(age>=0&&age<.7)for(let i=0;i<16;i++){const theta=i*2.399,spread=age*33;fx.rect(Math.round(x+Math.cos(theta)*spread),Math.round(y+Math.sin(theta)*spread+age*age*20),2,2).fill({color:i%2?c:0xead4aa,alpha:1-age/.7});}}
   if(f.dimmed)fx.rect(0,0,480,288).fill({color:0x181425,alpha:.65});
   const focus=p.replay&&movie>2?(movie>=34?{x:393,y:215}:action==='inspect'?{x:375,y:143}:action==='read'?{x:74,y:125}:action==='command'?{x:176,y:130}:f.phase==='checking'?{x:375,y:143}:{x:130,y:146}):{x:240,y:144};const z=p.replay&&movie>2?1.25:1,ease=1-Math.exp(-dt*3);camera.x+=(focus.x-camera.x)*ease;camera.y+=(focus.y-camera.y)*ease;camera.z+=(z-camera.z)*ease;
   const portrait=app.screen.height>app.screen.width,base=Math.max(1,Math.floor(portrait?app.screen.height/288:Math.min(app.screen.width/480,app.screen.height/288))),scale=base*camera.z,cx=480*scale<=app.screen.width?240:Math.max(app.screen.width/(2*scale),Math.min(480-app.screen.width/(2*scale),camera.x)),cy=288*scale<=app.screen.height?144:Math.max(app.screen.height/(2*scale),Math.min(288-app.screen.height/(2*scale),camera.y));world.scale.set(scale);world.position.set(Math.round(app.screen.width/2-cx*scale+(age>=0&&age<.18?Math.sin(age*120)*(1-age/.18)*2:0)),Math.round(app.screen.height/2-cy*scale));
   plate.clear();caption.style.wordWrapWidth=app.screen.width-100;caption.style.fontSize=portrait?44:32;caption.position.set(app.screen.width/2,app.screen.height/2);caption.text='';
   if(p.replay&&movie<2){plate.rect(0,0,app.screen.width,app.screen.height).fill({color:0x181425,alpha:.96});caption.text='Replay\n\n'+(p.title??'Recorded ticket');}
   else if(p.replay&&movie>=36){plate.rect(0,0,app.screen.width,app.screen.height).fill({color:0x181425,alpha:.96});caption.text=f.stamp?"Unfoolable — checked by a judge the AI can't touch.\n\n"+(f.stamp==='checked'?'Checked':f.stamp==='look closer'?'Checked with gaps':'Checks failed'):'Replay ended\n\nNo check result recorded.';}
   else if(p.replay){caption.position.set(app.screen.width/2,34);caption.text='Replay';caption.style.fontSize=portrait?24:18;}
   app.renderer.render(app.stage);if(host.current){host.current.dataset.officeFrames=String(++frames);host.current.dataset.officeAction=action;host.current.dataset.officeBuilder=JSON.stringify(position);host.current.dataset.officeMovie=movie.toFixed(2);host.current.dataset.officeCamera=JSON.stringify(camera);paintTotal+=performance.now()-started;if(frames%60===0)host.current.dataset.officePaintMs=(paintTotal/frames).toFixed(3);}
  }
  function tick(timestamp:number){raf=undefined;if(dead||disposed||document.hidden)return;if(timestamp-renderedAt<1000/60-.7){raf=requestAnimationFrame(tick);return;}renderedAt=timestamp;const lastDelta=last?(timestamp-last)/1000:0,dt=Math.min(.05,lastDelta);last=timestamp;elapsed+=dt;if(latest.current.replay&&latest.current.playing)movie+=lastDelta;paint(dt);if(!(latest.current.replay&&!latest.current.playing&&movie>=36))raf=requestAnimationFrame(tick);}
  function hit(event:PointerEvent){const rect=app.canvas.getBoundingClientRect(),x=((event.clientX-rect.left)/rect.width*app.screen.width-world.x)/world.scale.x,y=((event.clientY-rect.top)/rect.height*app.screen.height-world.y)/world.scale.y;const object=safetyObjectAt(x,y);if(object){latest.current.onObject?.(object);return;}for(let i=0;i<actors.length;i++){const actor=actors[i]!;if(Math.abs(x-actor.x)<24&&y>actor.y-48&&y<actor.y+5){latest.current.onRole?.((['builder','grader','writer','owner'] as const)[i]!);return;}}}
  function visibility(){cancel();if(!document.hidden&&!dead)raf=requestAnimationFrame(tick);}app.canvas.addEventListener('pointerup',hit);document.addEventListener('visibilitychange',visibility);owned={update,destroy};engine.current=owned;update();
 })().catch(()=>{owned?.destroy();if(!disposed)setFailed(true);});
 return()=>{disposed=true;engine.current=null;owned?.destroy();};
 },[theme,onCanvas]);
 useEffect(()=>{engine.current?.update();},[props.frame,props.activity,props.replay]);
 return <><div className="office-canvas" ref={host}/>{failed&&<p role="status">The drawing is unavailable. Your ticket and proof are still available.</p>}</>;
}

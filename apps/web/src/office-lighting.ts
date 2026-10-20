import {Container,Graphics,RenderTexture,Sprite,Rectangle,type Application} from 'pixi.js';
import {AdvancedBloomFilter} from '../vendor/pixi-filters-6.1.5/lib/advanced-bloom/AdvancedBloomFilter.mjs';
import {officeLight} from './office-light.ts';
import type {OfficeActivity} from './office-activity.ts';
/** Separate low-resolution light texture; six hard bands preserve the pixel palette. */
export function workshopLighting(app:Application){
 const texture=RenderTexture.create({width:480,height:288,resolution:1});texture.source.scaleMode='nearest';
 const map=new Container(),ambient=new Graphics(),lights=new Graphics();map.addChild(ambient,lights);lights.blendMode='add';
 const shade=new Sprite(texture);shade.blendMode='multiply';
 const emission=new Container(),rays=new Graphics(),glow=new Graphics(),details=new Graphics();emission.addChild(rays,glow,details);rays.blendMode='add';
 const bloom=new AdvancedBloomFilter({threshold:.55,bloomScale:.22,brightness:1,blur:2,quality:2});glow.filters=[bloom];glow.filterArea=new Rectangle(0,0,480,288);
 let previous='';
 function pool(x:number,y:number,rx:number,ry:number,color:number,strength:number){for(let band=6;band>0;band--)lights.ellipse(x,y,Math.round(rx*band/6),Math.round(ry*band/6)).fill({color,alpha:strength*(7-band)/24});}
 function paint(hour:number,time:number,activity:OfficeActivity|undefined,alarm:boolean){
  const light=officeLight(hour),night=light.period==='night',key=light.period;
  if(key!==previous){previous=key;ambient.clear().rect(0,0,480,288).fill(night?0x33304d:light.period==='evening'?0x9c716b:light.period==='morning'?0xf5d8b5:0xffefd8);lights.clear();
   if(night||light.period==='evening'){
    // Cool lab is the brightest volume; warm lamps never wash out its boundary.
    for(let b=6;b>0;b--)lights.roundRect(305-b,58-b,146+b*2,120+b*2,2).fill({color:0xc0cbdc,alpha:.105});
    pool(387,100,77,77,0xc0cbdc,.9);pool(390,121,46,35,0x2ce8f5,1.1);pool(110,115,46,39,0x2ce8f5,1.05);
    pool(259,62,43,46,0xfeae34,1);pool(360,223,53,38,0xfeae34,.8);
    for(const x of [24,280,456]){pool(x,42,22,28,0xfeae34,.95);lights.poly([x-2,35,x+2,35,x+15,74,x-15,74]).fill({color:0xfeae34,alpha:.15});lights.poly([x-2,31,x+2,31,x+11,11,x-11,11]).fill({color:0xead4aa,alpha:.13});}
    for(let b=0;b<5;b++)lights.poly([44+b*3,43,84+b*3,43,206-b*6,188,138+b*3,188]).fill({color:0x8b9bb4,alpha:.055});
   }else{
    for(let b=0;b<5;b++)lights.poly([43+b*3,43,113-b*3,43,225-b*4,190,128+b*3,190]).fill({color:0xfeae34,alpha:.025});
   }
   app.renderer.render({container:map,target:texture,clear:true});
  }
  glow.clear();details.clear();rays.clear();
  glow.rect(101,103,23,15).fill(night?0x124e89:0x193c3e).rect(379,105,23,15).fill(0x124e89);
  for(const x of [24,280,456])glow.rect(x-2,31,4,5).fill(night?0xfee761:0xead4aa);
  glow.rect(250,48,14,3).fill(0xfee761).rect(321,59,117,2).fill(night?0xc0cbdc:0x8b9bb4);
  glow.circle(205,30,8).fill(night?0x8b9bb4:0xead4aa);
  // Flickering code is only work when a real edit is recorded; otherwise a still screen.
  for(const x of [104,382])for(let j=0;j<3;j++)details.rect(x,106+j*3,activity?.action==='type'?6+(Math.floor(time*4+j)%4)*3:12,1).fill({color:0x2ce8f5,alpha:.65});
  if(activity?.tests){const {passed,total,failed}=activity.tests;for(let i=0;i<8;i++){const done=i<Math.floor(passed/total*8),bad=failed!==null&&failed>0&&i===7;glow.rect(369+i*9,77,4,9).fill(bad?0xe43b44:done?0x63c74d:0x3a4466);}}
  else for(let i=0;i<8;i++)details.rect(369+i*9,77,4,9).fill(0x3a4466);
  if(!night){for(let shaft=0;shaft<3;shaft++)for(let band=0;band<4;band++)rays.poly([45+shaft*30+band,43,60+shaft*30-band,43,151+shaft*30-band*2,186,116+shaft*30+band*2,186]).fill({color:0xead4aa,alpha:.018});for(let i=0;i<26;i++)details.rect(Math.round(66+(i*37)%133+Math.sin(time*.24+i)*3),Math.round(62+(i*23+time*2)%120),1,1).fill({color:0xead4aa,alpha:.33});}
  if(alarm)glow.circle(297,48,4).fill(Math.floor(time*2)%2?0xe43b44:0x733e39);
  return light;
 }
 return {shade,emission,paint,destroy:()=>{texture.destroy(true);map.destroy({children:true});bloom.destroy();}};
}

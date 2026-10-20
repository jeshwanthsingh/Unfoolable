"""Original OFFICE-2 pixel art. 32px sprite grid, no reference art sampled.
CC0-1.0 dedication; run with Pillow to regenerate assets beside this file.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json
P=Path(__file__).parent
INK='#25343b';WOOD='#946744';GOLD='#ddb976';TEAL='#437477'
def room(dark=False,builder_only=False):
 im=Image.new('RGBA',(480,288));d=ImageDraw.Draw(im)
 floor='#473f38' if dark else '#b99b73'; wall='#33494a' if dark else '#79918b'
 d.rectangle((4,5,475,279),fill=INK);d.rectangle((8,9,471,54),fill=wall);d.rectangle((8,55,471,275),fill=floor)
 for y in range(57,275,16):
  d.line((8,y,471,y),fill='#3e3934' if dark else '#a88a64')
  for x in range(8+(16 if (y//16)%2 else 0),471,48):d.line((x,y,x,y+15),fill='#584a3c' if dark else '#ab8b65')
 for x in range(8,471,16):d.rectangle((x,48,x+14,54),fill='#263e40' if dark else '#526d68')
 d.rectangle((8,55,471,58),fill='#243536');d.rectangle((8,270,471,275),fill='#26383a')
 # Window recess; sky is supplied by the renderer behind this cutout.
 d.rectangle((38,17,143,45),fill=INK);d.rectangle((41,19,140,41),fill=(0,0,0,0));d.rectangle((88,19,91,41),fill='#c7b391');d.rectangle((37,42,145,46),fill='#dec498')
 # Copper pipes, a real clock recess and warm sconces.
 d.line((160,12,278,12,278,42),fill='#846344',width=4);d.line((160,11,278,11),fill=GOLD)
 for x in [24,280,456]:
  d.rectangle((x-3,31,x+3,41),fill=INK);d.rectangle((x-2,31,x+2,35),fill='#f2d69a');d.line((x-6,42,x+6,42),fill='#c39762')
 d.ellipse((194,19,216,41),fill=INK);d.ellipse((196,21,214,39),fill='#e0d5bb')
 # Builder's rug and workstation.
 def rug(box,c):
  d.rectangle(box,fill=INK);x,y,a,b=box;d.rectangle((x+2,y+2,a-2,b-2),fill=c);d.rectangle((x+5,y+5,a-5,b-5),outline='#a8ac91')
 rug((26,103,194,185),'#516c68' if dark else '#728d80')
 def desk(x,y,w=68,monitor=True):
  d.rectangle((x+4,y+7,x+w+3,y+27),fill='#353630');d.rectangle((x,y,x+w,y+19),fill=INK);d.rectangle((x+2,y+2,x+w-2,y+14),fill='#bf9562');d.line((x+3,y+3,x+w-3,y+3),fill='#e4bd80');d.rectangle((x+4,y+18,x+9,y+28),fill=WOOD);d.rectangle((x+w-9,y+18,x+w-4,y+28),fill=WOOD)
  for a in range(x+10,x+w-5,17):d.line((a,y+4,a-3,y+12),fill='#ae8356')
  if monitor:
   d.rectangle((x+21,y-20,x+48,y+1),fill=INK);d.rectangle((x+23,y-18,x+46,y-3),fill='#304f57');d.rectangle((x+31,y+2,x+37,y+5),fill=INK);d.rectangle((x+19,y+7,x+47,y+11),fill='#34474a')
  d.rectangle((x+w-14,y+4,x+w-8,y+10),fill='#e3dac1');d.rectangle((x+w-8,y+5,x+w-6,y+8),outline='#e3dac1')
 desk(78,121)
 # Bookshelf with individually shaded, original books.
 d.rectangle((24,64,65,103),fill=INK);d.rectangle((27,66,62,101),fill='#664c3b')
 for row in [68,84]:
  for i,c in enumerate(['#819c8d','#d2a36b','#b46e55','#d5c19a','#657d8e','#c29578']):
   x=29+i*5;h=10+(i%3);d.rectangle((x,row+12-h,x+3,row+12),fill=c);d.point((x+1,row+12-h),fill='#f0d5ad')
  d.rectangle((27,row+13,62,row+15),fill='#c39762')
 # Standalone terminal with paper roll.
 d.rectangle((163,76,187,114),fill=INK);d.rectangle((165,78,185,95),fill='#7b8f82');d.rectangle((167,80,183,91),fill='#233e43');d.rectangle((165,98,185,102),fill='#c2b798');d.rectangle((170,105,180,114),fill='#d8d3b6');d.line((173,108,178,108),fill='#6b7364')
 # Tool bench, chair and pegboard.
 d.rectangle((75,65,136,83),fill='#3a4e4b');d.rectangle((77,67,134,81),outline='#b2a984')
 for x in range(81,134,8):d.line((x,70,x,77),fill='#bdaf8e')
 d.rectangle((93,157,115,164),fill=INK);d.rectangle((95,157,113,162),fill='#ab7954');d.rectangle((97,165,100,170),fill=INK);d.rectangle((108,165,111,170),fill=INK)
 def plant(x,y):
  d.rectangle((x-5,y,x+5,y+8),fill=INK);d.rectangle((x-4,y+1,x+4,y+6),fill='#bc7b52');d.line((x,y,x,y-16),fill='#3b6954',width=2)
  for dx,dy in [(-7,-8),(7,-12),(-5,-16),(5,-4)]:d.polygon([(x,y+dy+5),(x+dx,y+dy),(x+dx,y+dy-4),(x+1,y+dy)],fill='#84a578' if dark else '#628f69')
 plant(23,190);plant(199,60)
 if not builder_only:
  # Side desk, Writer notebooks and task lamp.
  rug((210,48,289,106),'#73684f');desk(217,62,56,False);d.rectangle((230,58,245,68),fill='#dfd9bc');d.line((237,58,237,68),fill='#9b947b');d.line((264,65,264,51,256,47),fill=GOLD,width=2);d.polygon([(251,47),(260,47),(263,51),(248,51)],fill='#e7c88f')
  # Glass room floor and back machinery. Boundary is closed, including handoff.
  d.rectangle((302,58,455,186),fill='#374e50' if dark else '#89a4a0')
  for yy in range(60,184,12):
   for xx in range(304,454,12):d.rectangle((xx,yy,xx+10,yy+10),outline='#425b5c' if dark else '#78938f')
  d.rectangle((317,71,440,94),fill=INK);d.rectangle((319,73,438,91),fill='#7b8d86');d.rectangle((325,76,358,87),fill='#243d43')
  for x in range(368,434,9):d.rectangle((x,76,x+5,87),fill='#718b89')
  desk(356,123,68);d.rectangle((316,112,338,155),fill=INK);d.rectangle((319,114,335,151),fill='#a5b8a9');d.rectangle((321,117,333,132),fill='#456566')
  for yy in [138,143,148]:d.line((322,yy,332,yy),fill='#526966')
  # Front glass frame, reflections, handoff box (Builder never enters).
  d.line((300,55,457,55,457,188,300,188,300,55),fill='#b0d2c5',width=2);d.line((303,58,454,58),fill='#e0e6ce');d.line((452,62,452,181),fill='#c6e1d4');d.line((307,156,345,118),fill='#bad2c0');d.line((310,161,333,138),fill='#9dbbb0');d.rectangle((295,146,305,170),fill=INK);d.rectangle((297,148,303,168),fill=GOLD)
  # Pneumatic package route: copper and brass collars.
  route=[(157,180),(232,180),(232,203),(391,203),(391,211)]
  d.line(route,fill=INK,width=9);d.line(route,fill='#8c6a48',width=5);d.line([(157,178),(230,178),(230,201),(390,201)],fill='#dfbc7b',width=1)
  for x,y in [(168,180),(213,180),(254,203),(295,203),(337,203),(378,203)]:d.rectangle((x-2,y-5,x+2,y+5),fill='#ceb07a');d.rectangle((x-1,y-3,x+1,y+3),fill='#725843')
  # Human stamp office is an alcove, not another identical coding desk.
  rug((302,211,454,261),'#6e6550');desk(338,226,94,False);d.rectangle((381,218,402,232),fill='#f0dfb4');d.line((386,222,398,222),fill='#b5a682');d.line((386,226,396,226),fill='#b5a682');d.rectangle((348,217,365,231),fill='#634a39');d.rectangle((351,210,362,218),fill='#cda365');d.rectangle((354,205,359,212),fill='#cda365');plant(448,250)
  d.rectangle((45,219,177,240),fill=INK);d.rectangle((47,221,175,236),fill='#7c6b54');d.rectangle((53,238,57,247),fill=WOOD);d.rectangle((165,238,169,247),fill=WOOD)
  # Original upholstered couch replaces the empty bench. Sleeping cat is decorative.
  d.rounded_rectangle((43,215,178,244),radius=5,fill=INK)
  d.rectangle((47,218,174,237),fill='#733e39')
  d.rectangle((51,219,104,232),fill='#b86f50');d.rectangle((108,219,170,232),fill='#b86f50')
  d.rectangle((41,225,49,241),fill='#3e2731');d.rectangle((171,225,180,241),fill='#3e2731')
  d.ellipse((117,226,144,237),fill='#e4a672');d.ellipse((137,225,149,234),fill='#ead4aa')
  d.polygon([(137,227),(137,222),(142,226)],fill='#e4a672');d.polygon([(145,226),(150,223),(149,230)],fill='#e4a672')
  d.line((140,230,143,230),fill=INK);d.line((146,230,148,230),fill=INK)
  d.arc((113,226,133,239),40,285,fill='#733e39',width=2)
 return im
for dark in [False,True]:
 room(dark,False).save(P/('room-'+('dark' if dark else 'light')+'.png'))
 room(dark,True).save(P/('builder-'+('dark' if dark else 'light')+'.png'))
# 32x32 original sprite atlas, four frames, four walk directions and eight action rows.
poses=['idle','walk-down','walk-up','walk-left','walk-right','type','read','carry','celebrate','worried','frozen','wave']
for role,coat,hair,skin in [('builder','#6e9990','#543b32','#e1ad7d'),('grader','#c5d4c3','#75614a','#bd855f'),('writer','#c79966','#303f49','#d99b70'),('owner','#8b91a4','#4a3b35','#e3ba94')]:
 atlas=Image.new('RGBA',(128,32*len(poses)))
 for row,pose in enumerate(poses):
  for frame in range(4):
   im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im);bob=1 if pose not in ['frozen','type'] and frame==1 else 0
   d.ellipse((7,27,25,30),fill='#25343b70');ox=1 if pose=='celebrate' and frame%2 else 0
   # boots / walking stride
   stride=2 if pose.startswith('walk') and frame%2 else 0
   d.rectangle((11-stride,24,15-stride,28),fill=INK);d.rectangle((18+stride,24,22+stride,28),fill=INK)
   d.rectangle((11,16+bob,22,25+bob),fill=INK);d.rectangle((12,17+bob,21,24+bob),fill=coat);d.rectangle((12,20+bob,14,24+bob),fill='#587c77' if role=='builder' else '#827963')
   d.rectangle((12+ox,5+bob,22+ox,16+bob),fill=INK);d.rectangle((13+ox,6+bob,21+ox,14+bob),fill=skin);d.rectangle((12+ox,4+bob,22+ox,8+bob),fill=hair);d.rectangle((11+ox,7+bob,13+ox,11+bob),fill=hair);d.rectangle((21+ox,7+bob,23+ox,10+bob),fill=hair)
   if pose!='walk-up':
    eye=frame!=3 or pose=='frozen'
    if eye:d.point((15+ox,11+bob),fill=INK);d.point((20+ox,11+bob),fill=INK)
    else:d.line((14+ox,12+bob,16+ox,12+bob),fill=hair);d.line((19+ox,12+bob,21+ox,12+bob),fill=hair)
    d.point((18+ox,14+bob),fill='#b77455')
   else:d.rectangle((12,5+bob,22,14+bob),fill=hair)
   if role=='grader' and pose!='walk-up':d.rectangle((13,9+bob,16,12+bob),outline=INK);d.rectangle((19,9+bob,22,12+bob),outline=INK);d.line((16,10+bob,19,10+bob),fill=INK)
   arm=13 if pose in ['celebrate','wave'] and frame%2 else 19+bob
   d.rectangle((8,arm,11,arm+4),fill=skin);d.rectangle((22,19+bob,25,23+bob),fill=skin)
   if pose=='read':d.rectangle((8,18,24,24),fill='#eee1bd');d.line((16,18,16,24),fill='#b4a381');d.line((10,20,14,20),fill='#927b62')
   if pose=='carry':d.rectangle((8,18,24,27),fill=INK);d.rectangle((9,19,23,25),fill='#c49659');d.rectangle((15,19,17,25),fill='#eed5a4')
   if pose=='type':d.rectangle((8,21+(frame%2),13,23+(frame%2)),fill=skin);d.rectangle((22,22-(frame%2),25,24-(frame%2)),fill=skin)
   if pose=='worried':d.line((14,9,16,10),fill=INK);d.line((19,10,21,9),fill=INK)
   if pose=='frozen':d.rectangle((10,4,23,26),outline='#abcac8')
   if pose=='walk-left':im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
   if pose in ['walk-left','walk-right']:
    # side profile differentiated by a one-pixel nose and single visible eye
    dd=ImageDraw.Draw(im);dd.rectangle((21 if pose=='walk-right' else 10,11,23 if pose=='walk-right' else 12,13),fill=skin)
   atlas.paste(im,(frame*32,row*32))
 atlas.resize((192,48*len(poses)),Image.Resampling.NEAREST).save(P/(role+'.png'))
# static original package
im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im);d.rectangle((5,9,26,25),fill=INK);d.rectangle((6,10,25,23),fill='#b78149');d.rectangle((7,10,24,13),fill='#ddad68');d.rectangle((14,10,17,23),fill='#efdaab');d.rectangle((19,15,23,18),fill='#e6d1aa');im.save(P/'package.png')

# OFFICE-3 limited ENDESGA 32 palette. Lospec permits free use of its palettes.
COLORS=['be4a2f','d77643','ead4aa','e4a672','b86f50','733e39','3e2731','a22633','e43b44','f77622','feae34','fee761','63c74d','3e8948','265c42','193c3e','124e89','0099db','2ce8f5','ffffff','c0cbdc','8b9bb4','5a6988','3a4466','262b44','181425','ff0044','68386c','b55088','f6757a','e8b796','c28569']
palette=Image.new('P',(1,1));palette.putpalette([v for c in COLORS for v in bytes.fromhex(c)]+[0]*(768-96))
for name in ['room-light','room-dark','builder-light','builder-dark','builder','grader','writer','owner','package']:
 path=P/(name+'.png');im=Image.open(path).convert('RGBA');alpha=im.getchannel('A');q=im.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');q.putalpha(alpha);q.save(path)

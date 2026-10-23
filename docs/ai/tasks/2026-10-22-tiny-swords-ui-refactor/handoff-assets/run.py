import sys; sys.path.insert(0,'.')
from mock import *
ic=lambda n:load(U+f'Icons/Icon_{n:02d}.png')
av=lambda n:load(U+f'Human Avatars/Avatars_{n:02d}.png')
def wood(bg,x,y,W,H): put(bg,nine(load(U+'Wood Table/WoodTable.png'),W,H,1),(x,y))
def scroll(bg,x,y,W,H): put(bg,nine(load(U+'Banners/Banner.png'),W,H,1),(x,y))
def base(W,H): return Image.new('RGBA',(W,H),(71,171,169,255))
def pasteS(bg,im,xy,size=None):
    if size: im=im.resize(size,Image.NEAREST)
    bg.paste(im,xy,im)
# A login
bg=base(1280,720)
scroll(bg,400,60,480,540)
banner(bg,420,30,440,'Corner Conquest','Red')
d=ImageDraw.Draw(bg)
text(d,(640,190),'Enter your commander name to begin',Fs,(70,45,25),'mm')
button(bg,470,230,340,'Sign in with Google','Blue')
d=ImageDraw.Draw(bg); text(d,(640,320),'— or —',Fs,(70,45,25),'mm')
carved(bg,470,350,340,70); d=ImageDraw.Draw(bg); text(d,(500,385),'Your Name',F,(120,90,60),'lm')
button(bg,470,450,340,'Enter Lobby','Red')
strip=three(load(R+'UI/Ribbons/Ribbon_Yellow_3Slides.png'),1280,1)
pasteS(bg,strip,(0,656),(1280,64))
d=ImageDraw.Draw(bg); text(d,(640,688),'Privacy Policy        Terms of Service        Thanks',Fs,(60,40,10),'mm')
bg.save('mockA_login.png')
# B lobby
bg=base(1280,720)
wood(bg,30,70,780,580)
banner(bg,150,40,540,'Open Matches','Yellow')
for i,(nm,pl,a) in enumerate([('Siege of Aldara','2/4',2),('Corner Brawl','1/2',12),('Bot Arena','3/4',7)]):
    y=170+i*110
    carved(bg,100,y,640,96); pasteS(bg,av(a),(112,y+12),(72,72))
    d=ImageDraw.Draw(bg); text(d,(200,y+34),nm,F,(60,35,15),'lm'); text(d,(200,y+64),'Host: Bo  ·  '+pl+' players',Fs,(90,60,35),'lm')
    button(bg,590,y+16,130,'Join','Blue')
paper(bg,840,90,410,280); banner(bg,880,40,330,'New Match','Blue')
d=ImageDraw.Draw(bg); text(d,(1045,190),'Players: 2 – 4',Fs,(70,45,25),'mm'); text(d,(1045,225),'Map: Archipelago',Fs,(70,45,25),'mm')
button(bg,900,280,290,'Create Match','Red')
paper(bg,840,400,410,250,True); d=ImageDraw.Draw(bg)
text(d,(1045,440),'Field Guide',F,(240,220,150),'mm'); text(d,(1045,490),'Armies, resources, cards…',Fs,(220,220,230),'mm')
pasteS(bg,ic(5),(1013,520))
bg.save('mockB_lobby.png')
# C game
bg=base(1280,720)
tm=load(R+'Terrain/Tileset/Tilemap_color1.png')
t=tm.crop((64,64,128,128))
for ix in range(10):
    for iy in range(7): bg.paste(t,(290+ix*66,110+iy*66),t)
for i,(n,v) in enumerate([(2,'12'),(3,'7'),(4,'9')]):
    x=20+i*170
    r=three(load(R+'UI/Ribbons/Ribbon_Blue_3Slides.png'),150,1); pasteS(bg,r,(x,10))
    pasteS(bg,ic(n),(x+4,14),(44,44))
    d=ImageDraw.Draw(bg); text(d,(x+95,40),v,F,(255,255,255),'mm')
banner(bg,500,6,300,'Turn 14 · Your move','Yellow')
for i,(nm,a) in enumerate([('Bo',2),('Mia',6),('Kai',12)]):
    y=100+i*100
    carved(bg,14,y,250,90); pasteS(bg,av(a),(24,y+12),(64,64))
    d=ImageDraw.Draw(bg); text(d,(100,y+30),nm,F,(60,35,15),'lm')
    bar=load(U+'Bars/SmallBar_Base.png'); pasteS(bg,bar,(100,y+42),(150,30))
paper(bg,1000,90,270,360); d=ImageDraw.Draw(bg)
text(d,(1135,125),'Event Log',F,(60,35,15),'mm')
for i,tx in enumerate(['Mia moved to (3,2)','Kai found a card','Bo collected wood','Mia attacked Kai']): text(d,(1030,170+i*34),tx,Fs,(70,45,25),'lm')
wood(bg,230,540,780,180)
for i,(c,l) in enumerate([('Blue','Move'),('Red','Attack'),('Blue','Cards'),('Blue','End Turn')]): button(bg,290+i*165,590,150,l,c)
bg.save('mockC_game.png')

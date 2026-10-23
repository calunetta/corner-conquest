from PIL import Image, ImageDraw, ImageFont
import os
R='/Users/clunetta/Documents/Games/Corner Conquest/public/tiny-swords/'
OUT='/private/tmp/claude-501/-Users-clunetta-Documents-Games-Corner-Conquest/27238a23-2bd0-45f8-b3bc-c1bd04de14ad/scratchpad/'
U=R+'UI Elements/UI Elements/'
def load(p): return Image.open(p).convert('RGBA')
def groups(flags):
    g=[];s=None
    for i,f in enumerate(flags+[False]):
        if f and s is None: s=i
        if not f and s is not None: g.append((s,i)); s=None
    return g
def slices(im,cell=64):
    w,h=im.size; a=im.split()[3]
    nc=w//cell; nr=h//cell
    cols=[any(a.crop((c*cell,0,(c+1)*cell,h)).getbbox() for _ in [0]) for c in range(nc)]
    rows=[a.crop((0,r*cell,w,(r+1)*cell)).getbbox() is not None for r in range(nr)]
    cg=[(s*cell,e*cell) for s,e in groups(cols)]; rg=[(s*cell,e*cell) for s,e in groups(rows)]
    return cg,rg
def nine(im,W,H,scale=2):
    cols,rows=slices(im)
    # choose 3 col groups, 3 row groups; if only one group (solid 9-slice) cut thirds
    def three(gs,n):
        if len(gs)>=3: return [gs[0],gs[len(gs)//2],gs[-1]]
        t=n//3; return [(0,t),(t,2*t),(2*t,n)]
    cg=three(cols,im.width); rg=three(rows,im.height)
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    xs=[cg[0][1]-cg[0][0],cg[2][1]-cg[2][0]]; ys=[rg[0][1]-rg[0][0],rg[2][1]-rg[2][0]]
    xs=[x*scale for x in xs]; ys=[y*scale for y in ys]
    xpos=[0,xs[0],W-xs[1],W]; ypos=[0,ys[0],H-ys[1],H]
    for r in range(3):
        for c in range(3):
            piece=im.crop((cg[c][0],rg[r][0],cg[c][1],rg[r][1]))
            tw=xpos[c+1]-xpos[c]; th=ypos[r+1]-ypos[r]
            if tw<=0 or th<=0: continue
            out.paste(piece.resize((tw,th),Image.NEAREST),(xpos[c],ypos[r]),piece.resize((tw,th),Image.NEAREST))
    return out
def three(im,W,scale=2):
    w,h=im.size; t=w//3
    L=im.crop((0,0,t,h));M=im.crop((t,0,2*t,h));Rr=im.crop((2*t,0,w,h))
    out=Image.new('RGBA',(W,h*scale),(0,0,0,0))
    L=L.resize((t*scale,h*scale),Image.NEAREST);Rr=Rr.resize((t*scale,h*scale),Image.NEAREST)
    mw=W-2*t*scale; M=M.resize((mw,h*scale),Image.NEAREST)
    out.paste(M,(t*scale,0),M);out.paste(L,(0,0),L);out.paste(Rr,(W-t*scale,0),Rr);return out
def sc(im,s): return im.resize((im.width*s,im.height*s),Image.NEAREST)
def put(bg,im,xy): bg.paste(im,xy,im)
F=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',22)
Fs=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
def text(d,xy,t,f=F,fill=(40,25,15),anchor='la'): d.text(xy,t,font=f,fill=fill,anchor=anchor)
def water(W,H):
    bg=Image.new('RGBA',(W,H),(71,171,169,255)); return bg
def banner(bg,x,y,W,label,color='Blue'):
    r=three(load(R+f'UI/Ribbons/Ribbon_{color}_3Slides.png'),W,1); put(bg,r,(x,y))
    d=ImageDraw.Draw(bg); text(d,(x+W//2,y+r.height//2-4),label,F,(255,255,255),'mm')
def button(bg,x,y,W,label,color='Blue',pressed=False):
    n=f'UI/Buttons/Button_{color}_3Slides'+('_Pressed' if pressed else '')+'.png'
    b=three(load(R+n),W,1); put(bg,b,(x,y)); d=ImageDraw.Draw(bg); text(d,(x+W//2,y+b.height//2-4),label,F,(255,255,255) if color!='Hover' else (40,25,15),'mm')
def wood_panel(bg,x,y,W,H): put(bg,nine(load(U+'Wood Table/WoodTable.png'),W,H,2),(x,y))
def paper(bg,x,y,W,H,special=False): put(bg,nine(load(U+'Papers/'+('SpecialPaper' if special else 'RegularPaper')+'.png'),W,H,2),(x,y))
def banner_scroll(bg,x,y,W,H): put(bg,nine(load(U+'Banners/Banner.png'),W,H,2),(x,y))
def carved(bg,x,y,W,H): put(bg,nine(load(R+'UI/Banners/Carved_9Slides.png'),W,H,2),(x,y))

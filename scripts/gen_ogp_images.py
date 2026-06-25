"""タイプ別OGPカード(1200x630 PNG)を16枚生成 -> public/ogp/<type>.png
og.png のデザイン（NOIR背景＋グループ色グロー＋走査線＋キャラ立ち絵）を流用し、
テキストを「タイプコード＋名称」に差し替える。
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W,H=1200,630
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,"public","ogp"); os.makedirs(OUT,exist_ok=True)
FREF=os.path.join(ROOT,"public","_debug")
AR=lambda s:ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf",s)
YG=lambda s:ImageFont.truetype("C:/Windows/Fonts/YuGothB.ttc",s)

# タイプ → 名称（16Personalities準拠）
NAMES={
    "INTJ":"建築家","INTP":"論理学者","ENTJ":"指揮官","ENTP":"討論者",
    "INFJ":"提唱者","INFP":"仲介者","ENFJ":"主人公","ENFP":"運動家",
    "ISTJ":"ロジスティシャン","ISFJ":"擁護者","ESTJ":"幹部","ESFJ":"領事",
    "ISTP":"巨匠","ISFP":"冒険家","ESTP":"起業家","ESFP":"エンターテイナー",
}
GROUP_RGB={"NT":(139,92,246),"NF":(16,185,129),"SJ":(59,130,246),"SP":(250,204,21)}
def group(t):
    if t[1]=="N": return "NT" if t[2]=="T" else "NF"
    return "SJ" if t[3]=="J" else "SP"

def glow(cx,cy,r,color,a):
    L=Image.new("RGBA",(W,H),(0,0,0,0))
    ImageDraw.Draw(L).ellipse([cx-r,cy-r,cx+r,cy+r],fill=color+(a,))
    return L.filter(ImageFilter.GaussianBlur(r*0.55))

def fit_font(text, base_px, max_w):
    """名称が長い場合はフォントを縮めて max_w に収める。"""
    px=base_px
    while px>28:
        f=YG(px)
        if ImageDraw.Draw(Image.new("RGB",(10,10))).textlength(text,font=f)<=max_w: return f
        px-=2
    return YG(28)

def card(t):
    g=group(t); col=GROUP_RGB[g]
    img=Image.new("RGBA",(W,H),(13,11,18,255))
    img=Image.alpha_composite(img, glow(850,330,460,col,90))         # グループ色(キャラ背後)
    img=Image.alpha_composite(img, glow(300,120,360,(194,20,59),55)) # 赤(左上)
    scan=Image.new("RGBA",(W,H),(0,0,0,0)); sd=ImageDraw.Draw(scan)
    for y in range(0,H,3): sd.line([(0,y),(W,y)],fill=(255,255,255,8))
    img=Image.alpha_composite(img,scan)
    # キャラ立ち絵（右）
    c=Image.open(os.path.join(FREF,f"{t.lower()}_ref.png")).convert("RGBA")
    bb=c.getchannel("A").getbbox(); c=c.crop(bb)
    CH=520; s=CH/c.height; c=c.resize((max(1,int(c.width*s)),CH),Image.NEAREST)
    img.alpha_composite(c,(860-c.width//2, H-30-c.height))
    d=ImageDraw.Draw(img)
    d.text((90,96),"PERSONA NOIR",font=AR(34),fill=(200,196,210,255))
    d.text((87,193),t,font=AR(150),fill=col+(160,))            # タイプコード影
    d.text((84,190),t,font=AR(150),fill=(255,255,255,255))     # タイプコード本体
    name=NAMES[t]
    nf=fit_font(name,60,600)                                   # 名称（長いものは自動縮小）
    d.text((92,366),name,font=nf,fill=col+(255,))
    d.rectangle([92,452,92+360,456],fill=col+(220,))
    d.text((92,478),"見栄と恐怖の性格診断",font=YG(30),fill=(190,182,200,255))
    img.convert("RGB").save(os.path.join(OUT,f"{t.lower()}.png"),"PNG")

for t in NAMES: card(t)
print(f"{len(NAMES)} 枚 -> public/ogp/<type>.png（名称入り）")

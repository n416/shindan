import json,io,os,time,urllib.request
from PIL import Image, ImageChops
API="https://api.pixellab.ai/v2"
tok=[l.split("=",1)[1].strip() for l in open(".env",encoding="utf-8") if l.startswith("PIXELLAB_API_TOKEN=")][0]
H={"Authorization":"Bearer "+tok}; UA={"User-Agent":"Mozilla/5.0"}
def get(p): return json.loads(urllib.request.urlopen(urllib.request.Request(API+p,headers=H),timeout=120).read())
def fetch(u): return Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read())).convert("RGBA")
job="0378f607-bf43-444a-8c93-3d3c9244c1f4"; cid="00f4ddeb-2a78-439c-948f-b0af7d6b8d19"
t0=time.time()
while True:
    st=get("/background-jobs/"+job)["status"]
    if st in ("completed","failed"): print("job:",st,flush=True); break
    if time.time()-t0>900: print("timeout"); raise SystemExit
    time.sleep(6)
d=get("/characters/"+cid)
frames=None
for a in d["animations"]:
    if "running" in (a.get("animation_type") or "").lower():
        for x in a["directions"]:
            if x["direction"]=="east": frames=x["frames"]
if not frames: print("no running east"); raise SystemExit
ims=[fetch(u) for u in frames]
def dpx(a,b): return sum(1 for p in ImageChops.difference(a,b).getdata() if p!=(0,0,0,0))
print("frames:",len(ims),"size:",ims[0].size)
print("loop gap last->first:",dpx(ims[-1],ims[0]))
print("adjacent:",[dpx(ims[i],ims[i+1]) for i in range(len(ims)-1)])
os.makedirs("scripts/_frames",exist_ok=True)
for i,im in enumerate(ims): im.save("scripts/_frames/entj_%d.png"%i)
w,h=ims[0].size; sheet=Image.new("RGBA",(w*len(ims),h),(20,20,28,255))
for i,im in enumerate(ims): sheet.paste(im,(i*w,0),im)
sheet.save("scripts/_frames/_entj_run_sheet.png")
pal=[]
for f in ims:
    al=f.getchannel("A"); p=f.convert("RGB").quantize(colors=255); p.paste(255,al.point(lambda x:255 if x<=128 else 0)); pal.append(p)
pal[0].save("public/sprites/runner-entj.gif",save_all=True,append_images=pal[1:],duration=90,loop=0,transparency=255,disposal=2)
print("wrote runner-entj.gif (running)",flush=True)

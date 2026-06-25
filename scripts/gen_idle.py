"""承認済み正面を参照に、各タイプの「正面アイドル(約5秒)→1回転」ループ動画を作る。
出力: public/sprites/runner-<type>.gif（アイドル＋回転を1本に連結）
使い方: python scripts/gen_idle.py ESTP   /   ALL --parallel 3
"""
import sys, os, base64, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_runner import (load_token, req, poll, fetch_image, SIZE, TYPES, STYLE,
                        OUT_DIR, ROOT, SPIN_ORDER)
from PIL import Image

DEBUG_FRONT = os.path.join(ROOT, "public", "_debug")
IDLE_MS = 140
ROT_MS = 90
IDLE_SECONDS = 5

def front_b64(t):
    with open(os.path.join(DEBUG_FRONT, f"{t.lower()}_ref.png"), "rb") as f:
        return base64.b64encode(f.read()).decode()

def to_pal(frames):
    out=[]
    for f in frames:
        a=f.getchannel("A"); p=f.convert("RGB").quantize(colors=255)
        p.paste(255, a.point(lambda x:255 if x<=128 else 0)); out.append(p)
    return out

def build(idle, rot, out):
    reps = max(1, round(IDLE_SECONDS*1000 / (len(idle)*IDLE_MS)))
    seq = to_pal(idle*reps + rot)
    durs = [IDLE_MS]*(len(idle)*reps) + [ROT_MS]*len(rot)
    seq[0].save(out, save_all=True, append_images=seq[1:], duration=durs,
                loop=0, transparency=255, disposal=2)
    return reps

def gen(token, t):
    accent, subject = TYPES[t]
    print(f"[{t}] create character from approved front ...", flush=True)
    c = req(token, "POST", "/create-character-v3", {
        "description": f"{subject}, {STYLE.format(accent=accent)}",
        "view": "side", "image_size": {"width": SIZE, "height": SIZE},
        "no_background": True,
        "reference_image": {"type": "base64", "base64": front_b64(t)},
    })
    cid = c["character_id"]; poll(token, c["background_job_id"])
    d = req(token, "GET", f"/characters/{cid}")
    rot = d.get("rotation_urls") or {}
    rot_frames = [fetch_image(rot[k]) for k in SPIN_ORDER if rot.get(k)]
    print(f"[{t}] add breathing-idle (south) ...", flush=True)
    a = req(token, "POST", "/animate-character", {
        "character_id": cid, "mode": "template",
        "template_animation_id": "breathing-idle", "directions": ["south"],
    })
    for j in a.get("background_job_ids", []): poll(token, j)
    d = req(token, "GET", f"/characters/{cid}")
    idle = None
    for an in d["animations"]:
        if "idle" in (an.get("animation_type") or "").lower() or "breath" in (an.get("animation_type") or "").lower():
            for x in an["directions"]:
                if x["direction"] == "south": idle = [fetch_image(u) for u in x["frames"]]
    if not idle or not rot_frames:
        raise SystemExit(f"[{t}] frames missing idle={bool(idle)} rot={len(rot_frames)}")
    os.makedirs(OUT_DIR, exist_ok=True)
    reps = build(idle, rot_frames, os.path.join(OUT_DIR, f"runner-{t.lower()}.gif"))
    print(f"[{t}] idle x{reps} ({len(idle)}f) + rot({len(rot_frames)}f) -> runner-{t.lower()}.gif", flush=True)

def main():
    raw = sys.argv[1:]
    parallel = 1; skip = set()
    for i, a in enumerate(raw):
        if a == "--parallel" and i+1 < len(raw): parallel = int(raw[i+1]); skip.add(i+1)
    args = [a.upper() for i, a in enumerate(raw) if not a.startswith("--") and i not in skip] or ["ESTP"]
    types = list(TYPES.keys()) if args == ["ALL"] else args
    token = load_token()
    def run(t):
        try: gen(token, t); return t, None
        except SystemExit as e: return t, str(e)
        except Exception as e: return t, repr(e)
    if parallel > 1 and len(types) > 1:
        with concurrent.futures.ThreadPoolExecutor(max_workers=parallel) as ex:
            for t, err in ex.map(run, types):
                if err: print(f"[{t}] FAILED: {err}", flush=True)
    else:
        for t in types:
            _, err = run(t)
            if err: print(f"[{t}] FAILED: {err}", flush=True)
    print("=== done ===", flush=True)
main()

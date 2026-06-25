#!/usr/bin/env python3
"""
PixelLab v2 キャラAPI（Web UIと同じパイプライン）で
「タイプ別・横向き全身の走りドット絵」を生成し、
透過GIF public/sprites/runner-<type>.gif として保存する。

フロー:
  1) POST /create-character-v3        … 横向き(side)・全身・8方向のキャラ生成（非同期）
  2) POST /animate-character          … "running" を east 方向で8コマ生成（非同期）
  3) GET  /characters/{id}            … 完成データから east の走りフレームURLを取得
  4) フレームDL → 透過GIF合成

使い方:
  python scripts/gen_runner.py ENTJ            # 1体（テスト）
  python scripts/gen_runner.py ALL             # 16体すべて
  python scripts/gen_runner.py ENTJ --dump     # キャラ詳細JSONも _char_<type>.json に保存
"""
import sys, os, json, base64, io, time, urllib.request, urllib.error
from PIL import Image

API = "https://api.pixellab.ai/v2"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "sprites")
DBG_DIR = os.path.join(ROOT, "scripts", "_frames")

SIZE = 128
TEMPLATE = "running-8-frames"  # 本物のループする走り（Web UIの「Running」と同一テンプレ）
DURATION = 90                  # 1コマ(ms)。走りのテンポ
DIRECTION = "east"
POLL_TIMEOUT = 1800

# 8方向回転ループ（spin-<type>.gif）用：南から時計回りに一周する向き順
SPIN_ORDER = ["south", "south-west", "west", "north-west",
              "north", "north-east", "east", "south-east"]
SPIN_DURATION = 130

# 明るく可愛い日本のアニメ調の女の子に統一。NOIRのダーク統一は廃止。
# 差し色を主役カラーにして、タイプごとの衣装/小物で個性を出す。
STYLE = ("a cute and attractive anime girl in Japanese anime art style, bright vibrant colors, "
         "{accent} as the main color theme, expressive big eyes, appealing modern character design, "
         "clean colorful pixel art, full body head to toe")

TYPES = {
    "INTJ": ("steel blue",      "an elegant woman architect in a fitted tailored pantsuit, holding a rolled blueprint"),
    "INTP": ("pale cyan",       "a cool woman analyst in a lab coat with glasses, holding a scalpel"),
    "ENTJ": ("crimson",         "a confident knight girl in fitted crimson and gold armor with a small tiara, standing upright, natural head-to-body proportions"),
    "ENTP": ("orange",          "a mischievous woman trickster in a stylish asymmetric coat, holding a firecracker"),
    "INFJ": ("violet",          "a slender mystical woman prophet in a hooded robe, holding a lantern, standing upright, natural head-to-body proportions"),
    "INFP": ("lavender pink",   "a dreamy woman in a flowing cloak and scarf, holding a paper boat"),
    "ENFJ": ("gold",            "a graceful woman leader in a ceremonial robe with a faint halo"),
    "ENFP": ("magenta",         "a cheerful woman performer with ribbons, holding balloons"),
    "ISTJ": ("cobalt blue",     "a stern woman warden in a buttoned uniform, holding a briefcase"),
    "ISFJ": ("sage green",      "a gentle woman caretaker in an apron, carrying a basket"),
    "ESTJ": ("deep teal",       "a commanding woman officer in a military overcoat with a badge, holding a baton"),
    "ESFJ": ("peach",           "a warm woman host carrying a tray of cups"),
    "ISTP": ("bright orange",   "a cool woman mechanic in a utility jumpsuit with goggles, holding a wrench"),
    "ISFP": ("dusty rose",      "an artistic woman in a smock and scarf, holding a paintbrush"),
    "ESTP": ("electric yellow", "a bold woman gambler in a racing jacket, holding a fan of cards"),
    "ESFP": ("hot pink",        "a glamorous woman performer in a sequined coat, holding a microphone"),
}

DUMP = "--dump" in sys.argv
USE_REF = "--ref" in sys.argv  # 正面全身デザインを参照画像としてv3に渡し、記号を保つ
REUSE_FRONT = "--reuse-front" in sys.argv  # 既存の正面参照を使い回す（デザイン固定で走りだけ振り直す）


def load_token():
    for line in open(os.path.join(ROOT, ".env"), encoding="utf-8"):
        if line.startswith("PIXELLAB_API_TOKEN="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("PIXELLAB_API_TOKEN が .env に見つかりません")


def req(token, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    })
    last = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(r, timeout=180) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            # 5xx / 429 は一時的とみなしてリトライ。4xx はそのまま失敗。
            if e.code in (429, 500, 502, 503, 504):
                last = f"HTTP {e.code}"
                time.sleep(4 * (attempt + 1))
                continue
            raise SystemExit(f"HTTP {e.code} {method} {path}: {e.read().decode()[:500]}")
        except (urllib.error.URLError, TimeoutError) as e:
            last = str(e)
            time.sleep(4 * (attempt + 1))
    raise SystemExit(f"{method} {path}: retries exhausted ({last})")


def usd(obj):
    u = obj.get("usage") or {}
    return (u.get("usd") or 0.0) if isinstance(u, dict) else 0.0


def poll(token, job_id):
    t0 = time.time()
    while True:
        j = req(token, "GET", f"/background-jobs/{job_id}")
        st = j.get("status")
        if st == "completed":
            return j
        if st == "failed":
            raise SystemExit(f"job {job_id} failed: {json.dumps(j)[:300]}")
        if time.time() - t0 > POLL_TIMEOUT:
            raise SystemExit(f"job {job_id} timeout")
        time.sleep(3)


def b64_to_img(b64):
    """base64 文字列を RGBA 画像に。"""
    if "," in b64[:64]:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")


def fetch_image(url):
    """フレームURLを取得して RGBA を返す（backblaze は UA 無しだと403）。"""
    rq = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(rq, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def find_east_run_frames(detail):
    """animations[].directions[] = {direction, frame_count, frames:[url...]} から east を取る。"""
    for anim in detail.get("animations", []):
        for d in anim.get("directions", []):
            if d.get("direction") == DIRECTION and d.get("frames"):
                return d["frames"]
    return None


def frames_to_gif(frames, out_path, duration=DURATION):
    pal = []
    for f in frames:
        a = f.getchannel("A")
        p = f.convert("RGB").quantize(colors=255)
        p.paste(255, a.point(lambda x: 255 if x <= 128 else 0))
        pal.append(p)
    pal[0].save(out_path, save_all=True, append_images=pal[1:],
                duration=duration, loop=0, transparency=255, disposal=2, optimize=False)


def gen_reference(token, t, desc):
    """正面・全身の NOIR デザインを1枚生成し、base64 と実コストを返す。"""
    r = req(token, "POST", "/create-image-pixflux", {
        "description": ("full body character sprite, head to toe, standing, entire "
                        "body visible including legs and feet, strong striking design, "
                        + desc),
        "image_size": {"width": SIZE, "height": SIZE},
        "no_background": True,
        "view": "side",
        "direction": "south",
        "text_guidance_scale": 9,
    })
    b64 = r["image"]["base64"]
    b64_to_img(b64).save(os.path.join(DBG_DIR, f"{t.lower()}_ref.png"))
    return b64, usd(r)


def gen_one(token, t):
    accent, subject = TYPES[t]
    desc = f"{subject}, {STYLE.format(accent=accent)}"
    spent = 0.0
    os.makedirs(DBG_DIR, exist_ok=True)

    body = {
        "description": desc,
        "view": "side",
        "image_size": {"width": SIZE, "height": SIZE},
        "no_background": True,
    }
    if USE_REF:
        ref_path = os.path.join(DBG_DIR, f"{t.lower()}_ref.png")
        if REUSE_FRONT and os.path.exists(ref_path):
            with open(ref_path, "rb") as f:
                ref_b64 = base64.b64encode(f.read()).decode()
            print(f"[{t}] reuse existing front design")
        else:
            print(f"[{t}] generating reference design ...")
            ref_b64, ref_cost = gen_reference(token, t, desc)
            spent += ref_cost
        body["reference_image"] = {"type": "base64", "base64": ref_b64}

    # 1) キャラ生成（横向き・全身）
    print(f"[{t}] creating character ...")
    c = req(token, "POST", "/create-character-v3", body)
    spent += usd(c)
    cid = c["character_id"]
    poll(token, c["background_job_id"])

    # 2) 歩容アニメ（east・テンプレ＝周期ループ）
    print(f"[{t}] animating ({TEMPLATE}) ...")
    a = req(token, "POST", "/animate-character", {
        "character_id": cid,
        "mode": "template",
        "template_animation_id": TEMPLATE,
        "directions": [DIRECTION],
    })
    spent += usd(a)
    for jid in a.get("background_job_ids", []):
        poll(token, jid)

    # 3) キャラ詳細からフレーム取得
    detail = req(token, "GET", f"/characters/{cid}")
    if DUMP:
        json.dump(detail, open(os.path.join(ROOT, "scripts", f"_char_{t.lower()}.json"), "w"), indent=1)
    os.makedirs(OUT_DIR, exist_ok=True)

    # 3a) 8方向回転ループ（spin-<type>.gif）— キャラ生成で得た rotation_urls から
    rot = detail.get("rotation_urls") or {}
    spin_frames = [fetch_image(rot[k]) for k in SPIN_ORDER if rot.get(k)]
    if len(spin_frames) >= 4:
        frames_to_gif(spin_frames, os.path.join(OUT_DIR, f"spin-{t.lower()}.gif"),
                      duration=SPIN_DURATION)
        print(f"[{t}] spin {len(spin_frames)} dirs -> spin-{t.lower()}.gif", flush=True)

    # 3b) 走り（runner-<type>.gif）
    refs = find_east_run_frames(detail)
    if not refs:
        raise SystemExit(f"[{t}] east の走りフレームが見つからない（--dump で構造を確認して）")

    frames = [fetch_image(x) for x in refs]
    os.makedirs(DBG_DIR, exist_ok=True)
    for i, f in enumerate(frames):
        f.save(os.path.join(DBG_DIR, f"{t.lower()}_{i}.png"))

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"runner-{t.lower()}.gif")
    frames_to_gif(frames, out)
    print(f"[{t}] {len(frames)}f -> {os.path.relpath(out, ROOT)}  ${spent:.4f}")
    return spent


def gen_front_only(token, types):
    """正面参照だけを生成し public/_debug/<type>_ref.png に公開（走りは作らない）。"""
    import shutil
    pub = os.path.join(ROOT, "public", "_debug")
    os.makedirs(pub, exist_ok=True)
    os.makedirs(DBG_DIR, exist_ok=True)
    for t in types:
        accent, subject = TYPES[t]
        desc = f"{subject}, {STYLE.format(accent=accent)}"
        print(f"[{t}] front ...", flush=True)
        gen_reference(token, t, desc)  # _frames/<t>_ref.png に保存
        shutil.copy(os.path.join(DBG_DIR, f"{t.lower()}_ref.png"),
                    os.path.join(pub, f"{t.lower()}_ref.png"))
        print(f"[{t}] -> /_debug/{t.lower()}_ref.png", flush=True)


def main():
    # --parallel N の N を型引数から除外する
    raw = sys.argv[1:]
    parallel = 1
    skip = set()
    for i, a in enumerate(raw):
        if a == "--parallel" and i + 1 < len(raw):
            parallel = int(raw[i + 1]); skip.add(i + 1)
    args = [a.upper() for i, a in enumerate(raw)
            if not a.startswith("--") and i not in skip] or ["ENTJ"]
    types = list(TYPES.keys()) if args == ["ALL"] else args
    bad = [t for t in types if t not in TYPES]
    if bad:
        raise SystemExit(f"不明なタイプ: {bad}")
    token = load_token()
    if "--front-only" in sys.argv:
        gen_front_only(token, types)
        return

    force = "--force" in sys.argv
    todo = []
    for t in types:
        out = os.path.join(OUT_DIR, f"runner-{t.lower()}.gif")
        if os.path.exists(out) and not force:
            print(f"[{t}] skip (既に存在) — 再生成は --force")
        else:
            todo.append(t)

    total = 0.0
    done = 0

    def run(t):
        try:
            return t, gen_one(token, t), None
        except SystemExit as e:
            return t, 0.0, str(e)

    if parallel > 1 and len(todo) > 1:
        import concurrent.futures
        print(f"=== 並列実行 workers={parallel} / {len(todo)}体 ===", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=parallel) as ex:
            for t, cost, err in ex.map(run, todo):
                if err:
                    print(f"[{t}] FAILED: {err}", flush=True)
                else:
                    total += cost; done += 1
    else:
        for t in todo:
            _, cost, err = run(t)
            if err:
                print(f"[{t}] FAILED: {err}", flush=True)
            else:
                total += cost; done += 1

    print(f"\n=== {done}体生成 / 合計 ${total:.4f} ===")


if __name__ == "__main__":
    main()

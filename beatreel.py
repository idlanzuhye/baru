#!/usr/bin/env python3
"""beatreel: talking-avatar explainer reels, one idea per beat.

  python3 beatreel.py make  script.json      voice -> captions -> page -> render -> mix -> <name>.mp4
  python3 beatreel.py board script.json      voice + a frames sheet only (check before rendering)
  python3 beatreel.py say   "some text"      how the voice will read a line (pronunciation check)
  python3 beatreel.py icons <word>           find icon names for "icon": "set:name"

The voice is Kokoro (local, offline) with misaki pronunciation (core/), the picture is the HTML/GSAP engine in
engine/, rendered by HyperFrames. See README.md and SKILL.md for the script format."""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from core import voice, sound   # noqa: E402


def browser():
    """A local headless Chrome for HyperFrames: $HYPERFRAMES_BROWSER_PATH, else a Playwright install, else None
    (HyperFrames then finds or downloads its own)."""
    if os.environ.get("HYPERFRAMES_BROWSER_PATH"): return os.environ["HYPERFRAMES_BROWSER_PATH"]
    import glob
    roots = [os.environ.get("PLAYWRIGHT_BROWSERS_PATH", ""), os.path.expanduser("~/.cache/ms-playwright"), os.path.expanduser("~/Library/Caches/ms-playwright")]
    for r in filter(None, roots):
        hits = sorted(glob.glob(os.path.join(r, "chromium_headless_shell-*", "chrome-*", "chrome-headless-shell")) +
                      glob.glob(os.path.join(r, "chromium_headless_shell-*", "chrome-*", "chrome-headless-shell.exe")))
        if hits: return hits[-1]
    return None


def gsap_js():
    for p in (os.path.join(HERE, "node_modules", "gsap", "dist", "gsap.min.js"), os.path.join(HERE, "engine", "gsap.min.js")):
        if os.path.exists(p): return p
    raise SystemExit("GSAP not found: run `npm install` in the beatreel folder (or bash setup.sh).")
r3 = lambda x: round(float(x), 3)
# default sound per scene type (engine/sfx); anything else gets a soft pop. "sfx": false on an item silences it,
# "sfx_id" picks another sound
POP = {"stamp": ("pro_impact/air", -13), "num": ("pro_pop_in/deep", -15), "term": ("pro_typing_run/blip", -21),
       "sticker": ("ui_pop/soft", -14), "starburst": ("mallet/up4", -16), "stars": ("mallet/up4", -18),
       "logo": ("mallet/celesta", -18), "wordmark": ("mallet/celesta", -18), "scramble": ("shutter/film", -16),
       "phone": ("ui_pop/boop", -16), "browser": ("ui_pop/boop", -16)}
WHOOSH = {"left", "right", "zoom", "drop", "swing", "flip"}


def norm(w): return re.sub(r"[^a-z0-9$%'-]", "", w.lower().replace("’", "'"))


def load(path):
    sc = json.load(open(path)); sc["_dir"] = os.path.dirname(os.path.abspath(path))
    sc["_name"] = sc.get("name") or os.path.splitext(os.path.basename(path))[0]
    # the voice module reads "scenes" with "lines": a beat is a scene
    sc["scenes"] = [{"lines": b["lines"], **({"pause_before": b["pause_before"]} if "pause_before" in b else {})} for b in sc["beats"]]
    # a voice that matches the presenter: Kai speaks with a male stock voice, Maya with a female one
    sc.setdefault("voice", {}).setdefault("name", "af_heart" if LOOKS.get(sc.get("character", "kai")) in FEMALE_LOOKS else "am_michael")
    return sc


def speak(sc, work):
    os.makedirs(work, exist_ok=True)
    tj = os.path.join(work, "timing.json")
    import hashlib   # the voice is redone when the lines, the voice settings, or the voice code / lexicon change
    code = hashlib.sha1(b"".join(open(os.path.join(HERE, "core", f), "rb").read() for f in ("voice.py", "pronounce.py", "lexicon.json"))).hexdigest()
    key = json.dumps([sc["scenes"], sc["voice"], sc.get("intro"), code], sort_keys=True)
    kf = os.path.join(work, "voice.key")
    if os.path.exists(tj) and os.path.exists(kf) and open(kf).read() == key:
        return json.load(open(tj))
    tm = voice.speak(sc, work); open(kf, "w").write(key); return tm


def beat_bounds(sc, tm):
    n = len(sc["beats"]); starts = [None] * n
    for l in tm["lines"]:
        if starts[l["scene"]] is None: starts[l["scene"]] = l["start"]
    b = []
    for i in range(n):
        t0 = 0.0 if i == 0 else starts[i] - 0.12
        t1 = (starts[i + 1] - 0.12) if i + 1 < n else tm["duration"]
        b.append([r3(t0), r3(t1)])
    return b


def word_time(tm, i, word, nth=0):
    hits = [w["t"] for l in tm["lines"] if l["scene"] == i for w in l["words"] if norm(w["w"]) == norm(word)]
    if len(hits) <= nth: raise SystemExit(f'beat {i}: word "{word}" (#{nth}) not in its lines')
    return hits[nth]


def at_time(v, tm, i, t0):
    """an item's moment: None (beat start), seconds from the beat start, or "word:xyz" / "word:xyz#2" (+-0.1); "next:word:xyz" looks in the next beat."""
    if v is None: return t0 + 0.05
    if isinstance(v, (int, float)): return t0 + v
    while v.startswith("next:"): v, i = v[5:], i + 1   # "next:word:x" = a word in the following beat (for items that "keep")
    m = re.match(r"word:(.+?)(?:#(\d+))?([+-]\d[\d.]*)?$", v)
    if not m: raise SystemExit(f"bad time {v!r}")
    return word_time(tm, i, m.group(1), int(m.group(2) or 1) - 1) - 0.06 + float(m.group(3) or 0)


def icon(name, size=120, color="#111"):
    from core import icons
    return icons.svg(name, size, color)


TIME_LISTS = ("ticks", "hiAt", "ringAt", "ats", "downAt", "crossAt", "chipAt")
TIME_ONE = ("rightAt", "dropAt", "tapAt", "claudeAt", "outsiderAt", "leaveAt", "endAt", "strikeAt", "checkAt", "answerAt",
            "linkAt", "sortAt", "markAt", "sendAt", "flipAt", "scanAt", "plugAt", "at2", "redAt", "darkAt",
            "crackAt", "logoAt", "arcsAt", "labelAt", "doneAt", "bugAt", "drawAt", "fallAt", "pressAt", "freezeAt", "countAt", "releaseAt", "okAt", "spinAt",
            "openAt", "typeAt", "tagAt", "suckAt", "outAt", "drainAt", "rollAt", "burstAt", "splitAt", "textAt", "picAt", "shatterAt")


def blocks(tm, max_words=7):
    """caption phrase blocks: a script line split into runs of <= max_words, breaking after punctuation when it can."""
    out = []
    for l in tm["lines"]:
        ws = [{"w": w["w"], "t": w["t"], "it": bool(w.get("italic"))} for w in l["words"]]; cur = []
        for k, w in enumerate(ws):
            cur.append(w); left = len(ws) - k - 1
            punct = w["w"].rstrip("\"'").endswith((",", ".", "?", "!", ":", ";", "—"))
            if left and (len(cur) >= max_words or (punct and len(cur) >= 3 and left >= 2)):
                out.append(cur); cur = []
        if cur: out.append(cur)
    return [{"start": c[0]["t"], "words": c} for c in out]


# code-drawn presenters (engine/avatar.js): name -> look. Add your own here after drawing it in avatar.js.
LOOKS = {"kai": "male", "maya": "female"}
FEMALE_LOOKS = {"female"}


def size(sc):
    f = str(sc.get("format", "9:16"))
    if f not in ("9:16", "16:9"): raise SystemExit(f'format must be "9:16" or "16:9", not {f!r}')
    return (1920, 1080) if f == "16:9" else (1080, 1920)


def build(sc, tm, work):
    W, H = size(sc)
    bounds = beat_bounds(sc, tm); dur = tm["duration"]; items, beats, cues, cams, reacts = [], [], [], [], []

    def prep(h, i, t0, until, top):
        o = dict(h); o["at"] = r3(at_time(h.get("at"), tm, i, t0))
        if top and "x" not in h and sc.get("hero_x"): o["x"] = sc["hero_x"]
        if until is not None: o["until"] = until
        elif "until" in h: o["until"] = r3(at_time(h["until"], tm, i, t0))
        for k in TIME_LISTS:
            if k in o: o[k] = [r3(at_time(x, tm, i, t0)) for x in o[k]]
        for k in TIME_ONE:
            if k in o: o[k] = r3(at_time(o[k], tm, i, t0))
        for k in ("src", "img"):
            if o.get(k) and not o[k].startswith(("http", "data:")):
                src = o[k] if os.path.isabs(o[k]) else os.path.join(sc["_dir"], o[k])
                dst = "assets/" + os.path.basename(src); shutil.copy(src, os.path.join(work, "page", dst)); o[k] = dst
        if o.get("covers"):
            cs = []
            for c in o["covers"]:
                src = c if os.path.isabs(c) else os.path.join(sc["_dir"], c); dst = "assets/" + os.path.basename(src)
                shutil.copy(src, os.path.join(work, "page", dst)); cs.append(dst)
            o["covers"] = cs
        for k in ("words", "speak", "scroll", "legend"):   # [[time, ...], ...]
            if k in o: o[k] = [[r3(at_time(x[0], tm, i, t0))] + list(x[1:]) for x in o[k]]
        for m in o.get("marks", []):
            for k in ("at", "until"):
                if k in m: m[k] = r3(at_time(m[k], tm, i, t0))
        if o.get("icon"): o["svg"] = icon(o["icon"], 160, o.get("color", "#111"))
        for k in [k for k in o if k.endswith("Icon")]:
            if o.get(k): o[k[:-4] + "Svg"] = icon(o[k], 160, o.get(k[:-4] + "Color", "#fff"))
        if isinstance(o.get("items"), list) and o["items"] and isinstance(o["items"][0], dict):
            o["items"] = [dict(x, svg=icon(x["icon"], 160, x.get("color", "#4338ca")) if x.get("icon") else "") for x in o["items"]]
        if o.get("tiles"): o["tiles"] = [dict(x, svg=icon(x["icon"], 160, x.get("color", "#111")) if x.get("icon") else "") for x in o["tiles"]]
        sid, g = POP.get(o["type"], ("pro_pop/thup", -19))
        if h.get("sfx", True):
            cues.append([o["at"], h.get("sfx_id", sid), g] + ([{"align": "start"}] if o["type"] == "term" else []))
            if o.get("in") in WHOOSH: cues.append([o["at"] + .12, "whoosh_fast/crisp", -21])
        for a_ in o.get("ats", [])[1:]: cues.append([a_, "pro_pop/thup", -19])
        for a_ in o.get("ticks", []): cues.append([a_, "pro_pop/tink", -18])
        if "dropAt" in o: cues.append([o["dropAt"], "whoosh_fast/crisp", -17])
        if o.get("children"): o["children"] = [prep(c, i, t0, None, False) for c in o["children"]]
        return o

    for i, (b, (t0, t1)) in enumerate(zip(sc["beats"], bounds)):
        beats.append({"t0": t0, "t1": t1, "slug": b.get("slug", f"{i + 1:02d}"), "count": b.get("count"), "bg": b.get("bg"), "wipe": b.get("wipe", False), "pres": b.get("presenter", True), "spot": b.get("kai")})
        hs = b.get("hero", []); hs = hs if isinstance(hs, list) else [hs]
        shots = [g if isinstance(g, list) else [g] for g in b.get("shots", [])]
        starts = [at_time(g[0].get("at"), tm, i, t0) for g in shots]
        for k, g in enumerate(shots):   # each shot ends where the next begins (or at the beat end)
            end = r3(starts[k + 1]) if k + 1 < len(shots) else r3(t1)
            for h in g:
                o = prep(dict(h, at=h.get("at", g[0].get("at"))), i, t0, end, True)
                if "until" in h: o["until"] = r3(at_time(h["until"], tm, i, t0))
                items.append(o)
        for h in hs:
            keep = h.get("keep", 0); until = r3(bounds[min(i + keep, len(bounds) - 1)][1])
            o = prep(h, i, t0, until, True)
            if "until" in h: o["until"] = r3(at_time(h["until"], tm, i, t0))
            items.append(o)
        if b.get("cam") == "big":
            first = min([at_time(h.get("at"), tm, i, t0) for h in hs] or [t1])
            cams.append({"t0": t0, "t1": r3(first) if first < t1 - .05 else None, "scale": b.get("camScale", 1.35), "y": b.get("camY", -150)})
        rs = b.get("react", []); rs = rs if isinstance(rs, list) else [rs]
        for x in rs:
            t = r3(at_time(x, tm, i, t0)); reacts.append(t); cues.append([t, "pro_impact/air", -16])
        if i: cues.append([t0, "swish/soft", -22])
        for s_ in b.get("sfx", []):   # extra sounds: [time|word:xyz, id, gain]
            cues.append([r3(at_time(s_[0], tm, i, t0)), s_[1], s_[2] if len(s_) > 2 else -16])
    lines = blocks(tm, sc.get("caption_words", 7))
    reel = {"dur": dur, "theme": sc.get("theme", "studio"), "counter": sc.get("counter"), "meta": sc.get("meta", False), "beats": beats, "items": items, "lines": lines,
            "cams": cams, "reacts": reacts, "kaiMove": sc.get("presenter_move", True), "fx": sc.get("fx", True), "heroScale": sc.get("hero_scale", 1.3),
            "bg": sc.get("bg", "grid"), "colors": sc.get("colors", {}), "W": W, "H": H, "wide": W > H}
    fill_gaps(items, dur)
    if sc.get("caption_y"): reel["capY"] = sc["caption_y"] if isinstance(sc["caption_y"], list) else [sc["caption_y"]] * 2
    fl = []
    for i, (b, (t0, t1)) in enumerate(zip(sc["beats"], bounds)):   # presenter cutaways: "flash": ["word:x", seconds]
        f = b.get("flash")
        if f: fl.append([r3(at_time(f[0], tm, i, t0)), f[1] if len(f) > 1 else .9])
    if fl: reel["flashes"] = fl
    hold = sc.get("max_hold")
    if hold:   # the visuals must keep changing: warn about anything on screen longer than max_hold seconds
        for o in items:
            if o["until"] - o["at"] > hold + .05: print(f'  ! held {o["until"] - o["at"]:.1f}s: {o["type"]} at {o["at"]:.2f}')
    if sc.get("character") == "none":
        reel["presenter"] = {"headX": .5, "headY": .31}; reel["nopres"] = True
    elif sc.get("character", "kai") in LOOKS:
        ws = [w for l in tm["lines"] for w in l["words"]]
        words = [{"t": w["t"], "d": r3((ws[k + 1]["t"] if k + 1 < len(ws) else w["t"] + .3) - w["t"]), "n": len(re.sub(r"[^A-Za-z0-9]", "", w["w"]))} for k, w in enumerate(ws)]
        P = sc.get("presenter", {}); wide = W > H
        reel["avatar"] = {"poses": [{"t0": t0, "pose": b.get("pose", "talk")} for b, (t0, _) in zip(sc["beats"], bounds)], "words": words,
                          "top": P.get("y", 470 if wide else 1060), "scale": P.get("scale", .8 if wide else 1), "cx": P.get("x", 1530 if wide else 540),
                          "look": LOOKS.get(sc.get("character", "kai"), "male"), "colors": sc.get("avatar_colors", {})}
        reel["presenter"] = {"headX": .5, "headY": .31}
    else:
        cdir = char_dir(sc)
        cj = json.load(open(os.path.join(cdir, "character.json")))
        reel["presenter"] = {"headX": cj.get("head_x", .517), "headY": cj.get("head_y", .31)}
    return reel, bounds, cues


def char_dir(sc):
    c = sc.get("character"); d = c if os.path.isabs(c) else os.path.join(sc["_dir"], c)
    if not os.path.isfile(os.path.join(d, "character.json")): raise SystemExit(f"character folder {d} has no character.json (see README: your own character)")
    return d


def fill_gaps(items, dur):
    """No empty frames: when nothing is on screen between two scenes, the last one stays until the next arrives."""
    top = sorted([o for o in items if o["type"] != "html"], key=lambda o: o["at"])
    for o in top:
        u = o.get("until", dur)
        if u >= dur - .05: continue
        nxt = [p["at"] for p in top if p["at"] > u - .02]
        if not nxt: o["until"] = r3(dur); continue
        if any(p is not o and p["at"] <= u + .02 and p.get("until", dur) > u + .05 for p in top): continue   # something else is up
        gap_end = min(nxt)
        if gap_end - u > .08: o["until"] = r3(gap_end)


def presenter(sc, bounds, dur):
    """the avatar at the bottom. Default "kai": the engine's own code-drawn presenter (engine/avatar.js), posed per
    beat. "character": "path/to/folder" uses your own video character (one transparent gesture clip per pose, looped);
    "character": "none" leaves the presenter out."""
    if sc.get("character", "kai") in LOOKS or sc.get("character") == "none":
        return None, '<div id="pres"><div id="presin"></div></div>'
    cdir = char_dir(sc)
    c = json.load(open(os.path.join(cdir, "character.json"))); clips, alias = c["clips"], c.get("aliases", {})
    cw, ch = c.get("canvas", [1800, 1080]); P = sc.get("presenter", {}); FW, FH = size(sc); wide = FW > FH
    W = P.get("width", 900 if wide else 1500); x = P.get("x", (1560 if wide else 540) - W / 2); y = P.get("y", 520 if wide else 1150)
    vids, k = "", 0
    for i, ((t0, t1), b) in enumerate(zip(bounds, sc["beats"])):
        name = b.get("pose", "talk"); name = alias.get(name, name); name = name if name in clips else c.get("default", "talk")
        a, z = clips[name]; tt, first = t0, True
        while tt < t1 - 0.02:
            ms = a + (min((z - a) * 0.3, 0.4) if first and i else 0); d = min(z - ms, t1 - tt)
            vids += (f'<video class="clip" src="assets/{c["file"]}" muted playsinline data-start="{r3(tt)}" data-duration="{r3(d)}" '
                     f'data-media-start="{r3(ms)}" data-track-index="3" style="position:absolute;left:0;top:0;width:100%;height:100%"></video>')
            tt += d; k += 1; first = False
    return os.path.join(cdir, c["file"]), (f'<div id="pres" style="left:{x}px;top:{y}px;width:{W}px;aspect-ratio:{cw}/{ch}">'
                                           f'<div id="presin">{vids}</div></div>')


def page(sc, tm, work):
    pg = os.path.join(work, "page"); shutil.rmtree(pg, ignore_errors=True); os.makedirs(os.path.join(pg, "assets"))
    shutil.copytree(os.path.join(HERE, "engine", "fonts"), os.path.join(pg, "fonts"))
    for f in ("beats.js", "avatar.js", "style.css", "worldmap.js"): shutil.copy(os.path.join(HERE, "engine", f), pg)
    shutil.copy(gsap_js(), os.path.join(pg, "gsap.min.js"))
    reel, bounds, cues = build(sc, tm, work)
    src, pres = presenter(sc, bounds, tm["duration"])
    vids = ""
    for k, o in enumerate([o for o in reel["items"] if o["type"] in ("video", "clip")]):
        o["vid"] = f"hv{k}"
        if o["type"] == "clip":   # a pre-rendered shot (e.g. 3D with alpha): starts exactly on its moment
            d = r3(o.get("until", tm["duration"]) - o["at"] + 0.05); a, ms = o["at"], o.get("media", 0)
        else: d = r3(o.get("until", tm["duration"]) - o["at"] + 0.2); a, ms = r3(o["at"] - 0.2), max(0, o.get("media", 0) - 0.2)
        vids += (f'<video class="clip" id="hv{k}" src="{o["src"]}" muted playsinline data-start="{r3(a)}" data-duration="{d}" '
                 f'data-media-start="{r3(ms)}" data-track-index="{4 + k}"></video>')
    if src: shutil.copy(src, os.path.join(pg, "assets", os.path.basename(src)))
    dur = tm["duration"]; FW, FH = size(sc); wide_cls = ' class="wide"' if FW > FH else ""
    mono_css = '<style>@font-face{font-family:MONO;src:url(fonts/ObelMono-VF.woff2) format("woff2");font-weight:100 900}</style>' if sc.get("mono") == "obel" else ""
    html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>{sc["_name"]}</title>
<link rel="stylesheet" href="style.css"/>{mono_css}<script src="gsap.min.js"></script></head><body>
<div id="root" data-composition-id="reel" data-start="0" data-duration="{dur}" data-width="{FW}" data-height="{FH}" data-fps="30"{wide_cls}>
 <div id="stage"><div id="dots"></div><div id="glow"></div><div id="flood"></div>
  <div id="meta"></div><div id="cap"></div><div id="heroes"></div>{pres}<div id="wipe"></div></div>
 <div id="vids" style="display:none">{vids}</div>
</div>
<script>window.REEL = {json.dumps(reel)};</script><script src="worldmap.js"></script><script src="beats.js"></script><script src="avatar.js"></script></body></html>'''
    open(os.path.join(pg, "index.html"), "w").write(html)
    return bounds, cues


def render(work, out):
    pg = os.path.join(work, "page"); env = dict(os.environ); b = browser()
    if b: env["HYPERFRAMES_BROWSER_PATH"] = b
    r = subprocess.run(["npx", "hyperframes", "render", ".", "-o", out], cwd=pg, env=env, capture_output=True, text=True)
    if r.returncode or not os.path.exists(out): print(r.stdout[-1500:], r.stderr[-1500:]); raise SystemExit("render failed")


def board(work, bounds, out, wide=False):
    """frames sheet: the middle of every beat."""
    from PIL import Image
    vid = os.path.join(work, "silent.mp4"); tiles = []; tw, th = (480, 270) if wide else (270, 480)
    for t0, t1 in bounds:
        p = os.path.join(work, "b.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{(t0 + t1) / 2:.2f}", "-i", vid, "-frames:v", "1", "-vf", f"scale={tw}:{th}", p])
        tiles.append(Image.open(p).convert("RGB"))
    cols = min(5 if wide else 8, len(tiles)); rows = (len(tiles) + cols - 1) // cols
    S = Image.new("RGB", (cols * tw, rows * th), "white")
    for k, t in enumerate(tiles): S.paste(t, ((k % cols) * tw, (k // cols) * th))
    S.save(out, quality=88)


def main():
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    cmd, path = sys.argv[1], sys.argv[2]
    if cmd == "say":
        from core import pronounce
        ps, rows, norm = pronounce.phonemes(" ".join(sys.argv[2:])); print("read as:", norm); print("phonemes:", ps)
        for r in rows: print(f"  {r['word']:18s} /{r['ph']}/  {r['why']}")
        return
    if cmd == "icons":
        from core import icons
        print("\n".join(icons.search(sys.argv[2]))); return
    if cmd not in ("make", "board"): print(__doc__); sys.exit(1)
    sc = load(path)
    work = os.path.join(sc["_dir"], "build", sc["_name"]); os.makedirs(work, exist_ok=True)
    print("voice ..."); tm = speak(sc, work)
    print(f"  {tm['duration']} s, {len(tm['lines'])} lines")
    bounds, cues = page(sc, tm, work)
    if sc.get("sfx") is False: cues = []   # "sfx": false = voice and music only
    intro = voice.intro(sc)
    if intro: cues.insert(0, [0.0, "file:" + intro["sound"], intro["gain"]])
    print("render ..."); render(work, os.path.join(work, "silent.mp4"))
    if cmd == "board":
        out = os.path.join(sc["_dir"], sc["_name"] + "-frames.jpg"); board(work, bounds, out, size(sc)[0] > size(sc)[1]); print("frames:", out); return
    dur, mw = tm["duration"], work
    print("mix ..."); lufs, n = sound.mix(mw, cues, dur, {"music": sc.get("music", {"style": "none"}), "levels": {"sfx": sc.get("sfx_level", -26), "music": sc.get("music", {}).get("level", -33)}})
    out = os.path.join(sc["_dir"], sc["_name"] + ".mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(work, "silent.mp4"), "-i", os.path.join(mw, "mix.wav"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)
    print(f"done: {out}  ({lufs:.1f} LUFS, {n} sounds)")


if __name__ == "__main__":
    main()

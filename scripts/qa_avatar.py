# QA exhaustif du rig cut-out : rend la POSE FINALE (et initiale) de chaque
# mouvement side/front avec EXACTEMENT les formules du composant React
# (CutSide/CutFront), en planches-contact pour inspection visuelle.
#
# Usage : python scripts/qa_avatar.py [body]   (defaut: m)

import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
rig = json.loads((ROOT / "src/app/data/avatar-rig.json").read_text())
MOTIONS = json.loads((ROOT / ".tmp_motions.json").read_text())
BODY = sys.argv[1] if len(sys.argv) > 1 else "m"
OUTD = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT

# ---------- transforms ----------

def M_rot(a_deg, px, py):
    a = math.radians(a_deg)
    c, s = math.cos(a), math.sin(a)
    return (c, -s, px - c * px + s * py, s, c, py - s * px - c * py)

def M_tr(dx, dy):
    return (1, 0, dx, 0, 1, dy)

def mul(m1, m2):
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (a1 * a2 + b1 * d2, a1 * b2 + b1 * e2, a1 * c2 + b1 * f2 + c1,
            d1 * a2 + e1 * d2, d1 * b2 + e1 * e2, d1 * c2 + e1 * f2 + f1)

IDENT = (1, 0, 0, 0, 1, 0)

def apply(m, x, y):
    a, b, c, d, e, f = m
    return a * x + b * y + c, d * x + e * y + f

def rot_of(m):
    return math.degrees(math.atan2(m[3], m[0]))

_cache = {}
def img(view, name):
    key = (view, name)
    if key not in _cache:
        _cache[key] = Image.open(ROOT / f"public/avatar2d/{BODY}/{view}/{name}.webp").convert("RGBA")
    return _cache[key]

def draw_piece(canvas, view, name, m, off, far=False):
    p = rig[f"{BODY}.{view}"]["pieces"][name]
    im = img(view, name + ("_far" if far else ""))
    tot = rot_of(m)
    rot = im.rotate(-tot, expand=True, resample=Image.BICUBIC)
    # ancre : coin (x,y) de la piece
    ax, ay = apply(m, p["x"], p["y"])
    ca, sa = math.cos(math.radians(tot)), math.sin(math.radians(tot))
    cx, cy = im.width / 2, im.height / 2
    rx = ca * (0 - cx) - sa * (0 - cy) + rot.width / 2
    ry = sa * (0 - cx) + ca * (0 - cy) + rot.height / 2
    canvas.alpha_composite(rot, (int(round(ax - rx + off[0])), int(round(ay - ry + off[1]))))

# ---------- defaults + merge (copie de ExerciseFigure) ----------

def side_defaults(stand):
    if stand:
        return dict(torso=0, head=0, headX=0, shoulderLift=0, shoulderShift=0,
                    armNear={"sh": 10, "el": 8}, armFar={"sh": 6, "el": 10},
                    thigh=-78, shin=2, foot=0, thighFar=-78, shinFar=2, footFar=0,
                    pelvisY=0, belly=0, gaze=1)
    return dict(torso=0, head=0, headX=0, shoulderLift=0, shoulderShift=0,
                armNear={"sh": 34, "el": 58}, armFar={"sh": 30, "el": 62},
                thigh=0, shin=0, foot=0, thighFar=0, shinFar=0, footFar=0,
                pelvisY=0, belly=0, gaze=1)

FRONT_DEFAULTS = dict(tilt=0, turn=0, nod=0, twist=0, bend=0, shrug=0, grow=0,
                      hipShift=0, knees=0, armL={"sh": 10, "el": 8}, armR={"sh": 10, "el": 8})

def merge(base, frame):
    out = dict(base)
    out.update(frame)
    return out

# ---------- rendu d'une pose (formules du composant) ----------

S_SIDE = 0.094
S_FRONT = 0.095
TILE = 150

def render_side(pose, stand):
    e = rig[f"{BODY}.side"]
    P = lambda n: e["pieces"][n]["pivot"]
    pel = e["pelvis"]
    cv = Image.new("RGBA", (820, 1120), (242, 238, 228, 255))
    off = (60, 60)

    hipN = -(pose["thigh"] + 78); kneeN = 78 + pose["thigh"] - pose["shin"]; ankN = pose["shin"] - pose["foot"] - 2
    hipF = -(pose["thighFar"] + 78); kneeF = 78 + pose["thighFar"] - pose["shinFar"]; ankF = pose["shinFar"] - pose["footFar"] - 2
    aN, aF = pose["armNear"], pose["armFar"]
    shN = (aN["sh"] - 7) if aN else 0; elN = (aN["el"] - 8) if aN else 0
    shF = (aF["sh"] - 7) if aF else 0; elF = (aF["el"] - 8) if aF else 0
    dyP = pose["pelvisY"] / S_SIDE
    root = M_tr(0, dyP)
    mT = mul(root, M_rot(pose["torso"], pel[0], pel[1]))

    # far leg
    mThF = mul(mul(root, M_tr(-14, 0)), M_rot(hipF, *P("thigh")))
    mShF = mul(mThF, M_rot(kneeF, *P("shin")))
    mFtF = mul(mShF, M_rot(ankF, *P("foot")))
    draw_piece(cv, "side", "thigh", mThF, off, far=True)
    draw_piece(cv, "side", "shin", mShF, off, far=True)
    draw_piece(cv, "side", "foot", mFtF, off, far=True)
    # far arm
    if aF:
        mAuF = mul(mul(mT, M_tr(-12, 0)), M_rot(shF, *P("armup")))
        mAlF = mul(mAuF, M_rot(elF, *P("armlo")))
        draw_piece(cv, "side", "armup", mAuF, off, far=True)
        draw_piece(cv, "side", "armlo", mAlF, off, far=True)
    # near leg
    mTh = mul(root, M_rot(hipN, *P("thigh")))
    mSh = mul(mTh, M_rot(kneeN, *P("shin")))
    mFt = mul(mSh, M_rot(ankN, *P("foot")))
    draw_piece(cv, "side", "thigh", mTh, off)
    draw_piece(cv, "side", "shin", mSh, off)
    draw_piece(cv, "side", "foot", mFt, off)
    # torso / head / near arm
    draw_piece(cv, "side", "torso", mT, off)
    mHd = mul(mul(mT, M_tr(pose["headX"] / S_SIDE, 0)), M_rot(pose["head"], *P("head")))
    draw_piece(cv, "side", "head", mHd, off)
    if aN:
        mAu = mul(mul(mT, M_tr(pose["shoulderShift"] / S_SIDE, pose["shoulderLift"] / S_SIDE)), M_rot(shN, *P("armup")))
        mAl = mul(mAu, M_rot(elN, *P("armlo")))
        draw_piece(cv, "side", "armup", mAu, off)
        draw_piece(cv, "side", "armlo", mAl, off)
    return cv

def render_front(pose):
    e = rig[f"{BODY}.front"]
    P = lambda n: e["pieces"][n]["pivot"]
    pel = e["pelvis"]
    cv = Image.new("RGBA", (820, 1120), (242, 238, 228, 255))
    off = (60, 60)

    shrugDy = -(pose["shrug"] * 5 + pose["grow"] * 3) / S_FRONT
    hipDx = pose["hipShift"] * 6 / S_FRONT
    twistDx = pose["twist"] * 2 / S_FRONT
    aL, aR = pose["armL"], pose["armR"]
    rL = -(aL["sh"] - 10) if aL else 0; eL = -(aL["el"] - 8) if aL else 0
    rR = (aR["sh"] - 10) if aR else 0; eR = (aR["el"] - 8) if aR else 0
    legOpen = pose["knees"] * 20
    root = M_rot(pose["bend"], pel[0], pel[1]) if pose["bend"] else IDENT

    mLL = mul(root, M_rot(-legOpen, *P("legL")))
    mLR = mul(root, M_rot(legOpen, *P("legR")))
    draw_piece(cv, "front", "legL", mLL, off)
    draw_piece(cv, "front", "legR", mLR, off)
    mT = mul(root, M_tr(hipDx + twistDx, 0))
    draw_piece(cv, "front", "torso", mT, off)
    mHd = mul(mul(mT, M_tr(pose["turn"] * 8, pose["nod"] * 4 + shrugDy * 0.6)), M_rot(pose["tilt"], *P("head")))
    draw_piece(cv, "front", "head", mHd, off)
    if aL:
        mAu = mul(mul(mT, M_tr(0, shrugDy)), M_rot(rL, *P("armLup")))
        mAl = mul(mAu, M_rot(eL, *P("armLlo")))
        draw_piece(cv, "front", "armLup", mAu, off)
        draw_piece(cv, "front", "armLlo", mAl, off)
    if aR:
        mAu = mul(mul(mT, M_tr(0, shrugDy)), M_rot(rR, *P("armRup")))
        mAl = mul(mAu, M_rot(eR, *P("armRlo")))
        draw_piece(cv, "front", "armRup", mAu, off)
        draw_piece(cv, "front", "armRlo", mAl, off)
    return cv

# ---------- planches-contact ----------

def main():
    tiles = []
    for mid, mo in MOTIONS.items():
        if mo["view"] == "side":
            stand = bool(mo.get("stand"))
            base = side_defaults(stand)
            frames = [merge(base, f) for f in mo["frames"]]
            for fi in ([0, len(frames) - 1] if len(frames) > 1 else [0]):
                tiles.append((f"{mid}[{fi}]", render_side(frames[fi], stand)))
        elif mo["view"] == "front":
            frames = [merge(FRONT_DEFAULTS, f) for f in mo["frames"]]
            for fi in ([0, len(frames) - 1] if len(frames) > 1 else [0]):
                tiles.append((f"{mid}[{fi}]", render_front(frames[fi])))

    cols, rows = 7, 4
    per = cols * rows
    n_sheets = (len(tiles) + per - 1) // per
    for si in range(n_sheets):
        sheet = Image.new("RGB", (cols * TILE, rows * (TILE + 14)), (235, 231, 220))
        d = ImageDraw.Draw(sheet)
        for i, (label, cvs) in enumerate(tiles[si * per:(si + 1) * per]):
            t = cvs.copy()
            t.thumbnail((TILE, TILE))
            x = (i % cols) * TILE
            y = (i // cols) * (TILE + 14)
            sheet.paste(t.convert("RGB"), (x + (TILE - t.width) // 2, y))
            d.text((x + 2, y + TILE + 1), label[:26], fill=(80, 60, 40))
        out = OUTD / f"qa_{BODY}_{si}.jpg"
        sheet.save(out, quality=76)
        print(out, f"({min(per, len(tiles)-si*per)} poses)")
    print("total poses:", len(tiles))

if __name__ == "__main__":
    main()

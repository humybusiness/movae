# Découpe les planches avatar (face + profil) en pièces articulables.
#
# Entrée  : assets-src/avatar-homme.png, assets-src/avatar-femme.png (1536x1024)
# Sortie  : public/avatar2d/{m,f}/{front,side}/<piece>.png (+ *_far.png assombries)
#           public/avatar2d/rig.json  (crops, pivots, hiérarchie, z-order)
#
# Principes :
#  - fond crème -> transparent (seuil de couleur) ;
#  - pièces découpées avec CHEVAUCHEMENT aux articulations (caps) : l'épaule du
#    bras recouvre le torse, le genou de la cuisse recouvre le tibia... ;
#  - vue profil : le bras proche recouvre le torse -> on répare le torse sous
#    le bras (aplats par bandes : pull / ourlet / pantalon) ;
#  - le profil est MIROIR (le personnage regarde à droite, comme les flèches).

import json
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public" / "avatar2d"

BG_TOL = 38  # tolérance de détourage autour de la couleur de fond


def load_mirrored(path, mirror):
    im = Image.open(path).convert("RGBA")
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def remove_bg(im):
    bg = im.getpixel((8, 8))[:3]
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - bg[0]) <= BG_TOL and abs(g - bg[1]) <= BG_TOL and abs(b - bg[2]) <= BG_TOL:
                px[x, y] = (r, g, b, 0)
    return im


def mx(x):  # miroir sheet 1536
    return 1536 - x


# ---------------------------------------------------------------------------
# Configuration des pièces. Coordonnées mesurées sur les planches ORIGINALES.
# Pour les vues "side" (miroir), le script convertit automatiquement.
# parent=None -> attaché à la racine (bassin). z croissant = dessiné après.
# ---------------------------------------------------------------------------

CFG = {
    ("m", "front"): {
        "mirror": False,
        "pelvis": (507, 552),
        "ground": 985,
        "pieces": {
            "legL":   dict(crop=(395, 540, 517, 992), pivot=(468, 558), parent=None, z=1, clear=[(508, 600, 517, 992)]),
            "legR":   dict(crop=(500, 540, 625, 992), pivot=(542, 558), parent=None, z=1, clear=[(500, 600, 509, 992)]),
            "torso":  dict(crop=(415, 240, 620, 580), pivot=(507, 552), parent=None, z=3,
                           clear=[(415, 345, 452, 580), (585, 345, 620, 580)]),
            "head":   dict(crop=(385, 15, 625, 278), pivot=(505, 262), parent="torso", z=4),
            "armLup": dict(crop=(340, 300, 470, 470), pivot=(438, 318), parent="torso", z=5,
                           clear=[(452, 345, 470, 470)]),
            "armLlo": dict(crop=(335, 428, 470, 672), pivot=(435, 445), parent="armLup", z=4,
                           clear=[(452, 428, 470, 672)]),
            "armRup": dict(crop=(540, 300, 672, 470), pivot=(577, 318), parent="torso", z=5,
                           clear=[(540, 345, 558, 470)]),
            "armRlo": dict(crop=(540, 428, 675, 672), pivot=(578, 445), parent="armRup", z=4,
                           clear=[(540, 428, 558, 470)]),
        },
    },
    ("m", "side"): {
        "mirror": True,
        "pelvis": (mx(1010), 558),
        "ground": 985,
        "pieces": {
            "thigh": dict(crop=(mx(1090), 545, mx(935), 748), pivot=(mx(1008), 562), parent=None, z=3),
            "shin":  dict(crop=(mx(1090), 712, mx(930), 915), pivot=(mx(1002), 732), parent="thigh", z=2),
            "foot":  dict(crop=(mx(1115), 885, mx(860), 998), pivot=(mx(1006), 902), parent="shin", z=1),
            "torso": dict(crop=(mx(1095), 238, mx(925), 585), pivot=(mx(1010), 558), parent=None, z=4,
                          inpaint=dict(zone=(mx(1078), 330, mx(990), 585),
                                       bands=[(0, 524, (mx(970), 420)), (524, 560, (mx(970), 545)), (560, 9999, (mx(970), 620))])),
            "head":  dict(crop=(mx(1135), 8, mx(865), 278), pivot=(mx(1012), 252), parent="torso", z=5),
            "armup": dict(crop=(mx(1090), 295, mx(975), 470), pivot=(mx(1025), 318), parent="torso", z=7),
            "armlo": dict(crop=(mx(1090), 428, mx(975), 672), pivot=(mx(1032), 445), parent="armup", z=6,
                          keep_poly=[(452,428),(552,428),(552,555),(538,570),(534,672),(474,672),(470,570),(452,555)],
                          color_clear=dict(y_from=560, ref=(566, 620), tol=34)),
        },
        "far": {"thigh": "thigh", "shin": "shin", "foot": "foot", "armup": "armup", "armlo": "armlo"},
    },
    ("f", "front"): {
        "mirror": False,
        "pelvis": (503, 548),
        "ground": 985,
        "pieces": {
            "legL":   dict(crop=(392, 535, 512, 995), pivot=(466, 552), parent=None, z=1, clear=[(505, 600, 512, 995)]),
            "legR":   dict(crop=(498, 535, 622, 995), pivot=(538, 552), parent=None, z=1, clear=[(498, 600, 506, 995)]),
            "torso":  dict(crop=(415, 240, 615, 575), pivot=(503, 548), parent=None, z=3,
                           clear=[(415, 340, 450, 575), (582, 340, 615, 575)]),
            "head":   dict(crop=(370, 20, 635, 275), pivot=(500, 258), parent="torso", z=4),
            "armLup": dict(crop=(340, 295, 468, 468), pivot=(436, 315), parent="torso", z=5,
                           clear=[(450, 340, 468, 468)]),
            "armLlo": dict(crop=(335, 425, 468, 668), pivot=(433, 442), parent="armLup", z=4,
                           clear=[(450, 425, 468, 668)]),
            "armRup": dict(crop=(538, 295, 670, 468), pivot=(572, 315), parent="torso", z=5,
                           clear=[(538, 340, 556, 468)]),
            "armRlo": dict(crop=(538, 425, 672, 668), pivot=(576, 442), parent="armRup", z=4,
                           clear=[(538, 425, 556, 468)]),
        },
    },
    ("f", "side"): {
        "mirror": True,
        "pelvis": (mx(1002), 552),
        "ground": 985,
        "pieces": {
            "thigh": dict(crop=(mx(1080), 540, mx(930), 745), pivot=(mx(1000), 558), parent=None, z=3),
            "shin":  dict(crop=(mx(1080), 708, mx(925), 912), pivot=(mx(996), 728), parent="thigh", z=2),
            "foot":  dict(crop=(mx(1110), 880, mx(855), 998), pivot=(mx(1000), 898), parent="shin", z=1),
            "torso": dict(crop=(mx(1090), 240, mx(920), 580), pivot=(mx(1002), 552), parent=None, z=4,
                          inpaint=dict(zone=(mx(1075), 330, mx(995), 580),
                                       bands=[(0, 515, (mx(965), 420)), (515, 552, (mx(965), 535)), (552, 9999, (mx(965), 610))])),
            "head":  dict(crop=(mx(1120), 15, mx(855), 278), pivot=(mx(992), 255), parent="torso", z=5),
            "armup": dict(crop=(mx(1085), 295, mx(980), 470), pivot=(mx(1018), 318), parent="torso", z=7),
            "armlo": dict(crop=(mx(1085), 425, mx(976), 668), pivot=(mx(1026), 442), parent="armup", z=6,
                          keep_poly=[(452,425),(550,425),(550,540),(558,560),(556,662),(492,662),(490,560),(452,540)],
                          color_clear=dict(y_from=555, ref=(571, 610), tol=34)),
        },
        "far": {"thigh": "thigh", "shin": "shin", "foot": "foot", "armup": "armup", "armlo": "armlo"},
    },
}

SHEETS = {"m": "avatar-homme.png", "f": "avatar-femme.png"}


def cut():
    rig = {}
    for (body, view), cfg in CFG.items():
        sheet = remove_bg(load_mirrored(SRC / SHEETS[body], cfg["mirror"]))
        outdir = OUT / body / view
        outdir.mkdir(parents=True, exist_ok=True)
        entry = {"pelvis": list(cfg["pelvis"]), "ground": cfg["ground"], "pieces": {}}

        for name, p in cfg["pieces"].items():
            x1, y1, x2, y2 = p["crop"]
            piece = sheet.crop((x1, y1, x2, y2)).copy()

            # réparation du torse (bandes d'aplats sous le bras)
            if "inpaint" in p:
                iz = p["inpaint"]["zone"]
                px = piece.load()
                colors = []
                for y_from, y_to, ref in p["inpaint"]["bands"]:
                    c = sheet.getpixel(ref)
                    colors.append((y_from, y_to, (c[0], c[1], c[2], 255)))
                for yy in range(max(iz[1], y1), min(iz[3], y2)):
                    for xx in range(max(iz[0], x1), min(iz[2], x2)):
                        for y_from, y_to, c in colors:
                            if y_from <= yy < y_to:
                                px[xx - x1, yy - y1] = c
                                break

            # masque polygonal : ne garder que l'intérieur
            if "keep_poly" in p:
                from PIL import ImageDraw
                mask = Image.new("L", piece.size, 0)
                dr = ImageDraw.Draw(mask)
                dr.polygon([(px_ - x1, py_ - y1) for px_, py_ in p["keep_poly"]], fill=255)
                empty = Image.new("RGBA", piece.size, (0, 0, 0, 0))
                piece = Image.composite(piece, empty, mask)

            # retire une couleur parasite (pantalon derriere la main)
            if "color_clear" in p:
                cc = p["color_clear"]
                ref = sheet.getpixel(cc["ref"])[:3]
                tol = cc["tol"]
                px = piece.load()
                for yy in range(max(cc["y_from"], y1), y2):
                    for xx in range(x1, x2):
                        r, g, b, a = px[xx - x1, yy - y1]
                        if a and abs(r - ref[0]) <= tol and abs(g - ref[1]) <= tol and abs(b - ref[2]) <= tol:
                            px[xx - x1, yy - y1] = (0, 0, 0, 0)

            # zones à vider (partition bras/torse en vue de face)
            for cx1, cy1, cx2, cy2 in p.get("clear", []):
                px = piece.load()
                for yy in range(max(cy1, y1), min(cy2, y2)):
                    for xx in range(max(cx1, x1), min(cx2, x2)):
                        px[xx - x1, yy - y1] = (0, 0, 0, 0)

            piece.save(outdir / f"{name}.webp", "WEBP", quality=88)
            entry["pieces"][name] = {
                "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                "pivot": list(p["pivot"]), "parent": p["parent"], "z": p["z"],
            }

        # variantes assombries (membres éloignés, vue profil)
        for far_name, src_name in cfg.get("far", {}).items():
            im = Image.open(outdir / f"{src_name}.webp").convert("RGBA")
            dark = ImageEnhance.Brightness(im).enhance(0.72)
            dark.save(outdir / f"{src_name}_far.webp", "WEBP", quality=85)

        rig[f"{body}.{view}"] = entry
        print(body, view, "->", len(entry["pieces"]), "pieces")

    (OUT / "rig.json").write_text(json.dumps(rig), encoding="utf-8")
    (ROOT / "src" / "app" / "data" / "avatar-rig.json").write_text(json.dumps(rig), encoding="utf-8")
    print("rig.json ecrit")


if __name__ == "__main__":
    cut()

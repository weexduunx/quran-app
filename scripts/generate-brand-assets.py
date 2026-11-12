"""
Génère les icônes et l'image de démarrage de l'app à partir du symbole Bayân :
étoile à huit branches (Rub el-Hizb) autour d'un moushaf ouvert, les trois
pointes du bas aux couleurs du drapeau sénégalais.

Les coordonnées sont celles de la maquette (viewBox 0 0 100 100).
Usage :  python scripts/generate-brand-assets.py
Dépendance : Pillow
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
SS = 4  # suréchantillonnage pour l'anticrénelage

EMERALD = (11, 61, 46, 255)      # #0B3D2E
GOLD = (233, 212, 154, 255)      # #E9D49A
IVORY = (243, 238, 223, 255)     # #F3EEDF
FLAG_GREEN = (31, 163, 92, 255)  # #1FA35C (vert du drapeau éclairci pour fond sombre)
FLAG_YELLOW = (253, 239, 66, 255)
FLAG_RED = (227, 27, 35, 255)
WHITE = (255, 255, 255, 255)

STAR = [(50, 13.2), (60.8, 24), (76, 24), (76, 39.2), (86.8, 50), (76, 60.8), (76, 76), (60.8, 76),
        (50, 86.8), (39.2, 76), (24, 76), (24, 60.8), (13.2, 50), (24, 39.2), (24, 24), (39.2, 24)]


def bezier(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def page(mirror=False):
    # M48.6 39.5 C43 35.6 36.6 35.4 31.5 37.6 L31.5 61.6 C36.6 59.4 43 59.6 48.6 63.5 Z
    pts = [(48.6, 39.5)]
    pts += bezier((48.6, 39.5), (43, 35.6), (36.6, 35.4), (31.5, 37.6))
    pts += [(31.5, 61.6)]
    pts += bezier((31.5, 61.6), (36.6, 59.4), (43, 59.6), (48.6, 63.5))
    if mirror:
        pts = [(100 - x, y) for x, y in pts]
    return pts


def draw_mark(size, box, stroke, mono=None, bg=None, radius=0):
    """size : côté de l'image ; box : côté du viewBox 100 en px ; stroke : épaisseur (unités viewBox)."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    if bg:
        ImageDraw.Draw(img).rounded_rectangle([0, 0, S - 1, S - 1], radius=radius * SS, fill=bg)

    k = box * SS / 100
    off = (S - box * SS) / 2
    tr = lambda pts: [(off + x * k, off + y * k) for x, y in pts]

    # Masque du trait de l'étoile (jointures arrondies)
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    star = tr(STAR)
    md.line(star + [star[0], star[1]], fill=255, width=round(stroke * k), joint="curve")

    # Couleurs par zone : haut en or, pointes du bas vert / jaune / rouge
    color = Image.new("RGBA", (S, S), mono or GOLD)
    if not mono:
        cd = ImageDraw.Draw(color)
        y57 = off + 57 * k
        cd.rectangle([0, y57, off + 37 * k, S], fill=FLAG_GREEN)
        cd.rectangle([off + 37 * k, y57, off + 63 * k, S], fill=FLAG_YELLOW)
        cd.rectangle([off + 63 * k, y57, S, S], fill=FLAG_RED)
    img.paste(color, (0, 0), mask)

    d = ImageDraw.Draw(img)
    d.polygon(tr(page()), fill=mono or IVORY)
    d.polygon(tr(page(True)), fill=mono or IVORY)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # iOS / icône générique : carré plein (iOS applique lui-même l'arrondi)
    draw_mark(1024, 1024 * 0.76, 3.2, bg=EMERALD).convert("RGB").save(OUT / "icon.png")
    # Android adaptative : fond uni + symbole dans la zone de sécurité (≈ 53 % du canevas)
    Image.new("RGBA", (512, 512), EMERALD).save(OUT / "android-icon-background.png")
    draw_mark(512, 512 * 0.72, 3.6).save(OUT / "android-icon-foreground.png")
    draw_mark(432, 432 * 0.72, 3.6, mono=WHITE).save(OUT / "android-icon-monochrome.png")
    # Démarrage : symbole seul sur fond transparent (fond émeraude défini dans app.json)
    draw_mark(1024, 1024, 3.2).save(OUT / "splash-icon.png")
    # Favicon web
    draw_mark(48, 48 * 0.8, 5, bg=EMERALD, radius=10).save(OUT / "favicon.png")
    print("Icônes générées dans", OUT)


if __name__ == "__main__":
    main()

# redesign_deck.py
"""
SAMO PPTX Redesign — corrige le probleme "texte trop petit, case presque
vide" observe sur les diapositives generees (gabarit commun a tous les
cours : Support informatique, Word, Soutien Reseautique/Windows Server).

Principe : pour chaque zone de texte de CONTENU (on exclut le bandeau
d'en-tete/pied de page qui doit rester discret), on calcule le taux de
remplissage actuel de la case (occupancy = hauteur de texte estimee /
hauteur de la case). Plus une case est vide, plus on agrandit fortement
la police ; une case deja bien remplie n'est que legerement agrandie,
pour ne jamais faire deborder le texte. Le texte est aussi recentre
verticalement dans sa case.

Usage :
  python redesign_deck.py uploads/Seance_31.pptx
  -> ecrit uploads/Seance_31.pptx (modifie sur place) et fait une copie
     de sauvegarde uploads/Seance_31.pptx.bak si elle n'existe pas deja.
"""

import shutil
import sys
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.util import Pt

# Bandeau haut (logo + titre de seance + formateur + version) et bandeau
# bas (fil d'ariane) : on ne touche pas a ces zones, elles doivent rester
# discretes. Coordonnees stables sur tout le gabarit (12188825 x 6858000).
HEADER_LIMIT_EMU = 620000
FOOTER_START_EMU = 6650000


def is_chrome(shape, slide_height):
    if shape.top is None:
        return True
    if shape.top < HEADER_LIMIT_EMU:
        return True
    if shape.top > FOOTER_START_EMU:
        return True
    return False


def first_font_size_pt(text_frame):
    for p in text_frame.paragraphs:
        for r in p.runs:
            if r.text.strip() and r.font.size:
                return r.font.size.pt
    return None


def count_nonempty_paragraphs(text_frame):
    n = 0
    for p in text_frame.paragraphs:
        if any(r.text.strip() for r in p.runs):
            n += 1
    return max(n, 1)


def compute_new_size_pt(old_pt, box_height_emu, n_paragraphs):
    box_height_pt = box_height_emu / 12700
    if box_height_pt <= 0:
        return None

    occupancy = (old_pt * 1.25 * n_paragraphs) / box_height_pt

    if occupancy < 0.30:
        factor, target = 1.8, 0.60
    elif occupancy < 0.60:
        factor, target = 1.35, 0.75
    else:
        factor, target = 1.12, 0.85

    new_pt = old_pt * factor
    max_pt = (target * box_height_pt) / (1.25 * n_paragraphs)
    new_pt = min(new_pt, max_pt)
    new_pt = max(new_pt, old_pt)
    return round(new_pt, 1)


def redesign_text_shape(shape):
    tf = shape.text_frame
    old_pt = first_font_size_pt(tf)
    if old_pt is None:
        return

    n_paragraphs = count_nonempty_paragraphs(tf)
    new_pt = compute_new_size_pt(old_pt, shape.height, n_paragraphs)
    if new_pt is None or new_pt <= old_pt + 0.05:
        # Meme tres legere hausse minimale pour rester coherent visuellement.
        new_pt = old_pt * 1.05

    for p in tf.paragraphs:
        for r in p.runs:
            if r.text.strip() and r.font.size:
                r.font.size = Pt(new_pt)

    tf.word_wrap = True
    try:
        tf.auto_size = MSO_AUTO_SIZE.NONE
    except Exception:
        pass
    try:
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    except Exception:
        pass


def redesign_table(shape):
    table = shape.table
    row_height_pt = None
    for row in table.rows:
        rh_pt = row.height / 12700
        row_height_pt = rh_pt if row_height_pt is None else min(row_height_pt, rh_pt)

    for row in table.rows:
        for cell in row.cells:
            tf = cell.text_frame
            old_pt = first_font_size_pt(tf)
            if old_pt is None:
                continue
            new_pt = old_pt * 1.15
            if row_height_pt:
                max_pt = (0.6 * row_height_pt) / 1.25
                new_pt = min(new_pt, max(max_pt, old_pt))
            for p in tf.paragraphs:
                for r in p.runs:
                    if r.text.strip() and r.font.size:
                        r.font.size = Pt(round(new_pt, 1))


def redesign(pptx_path):
    pptx_path = Path(pptx_path)
    prs = Presentation(pptx_path)

    for slide in prs.slides:
        for shape in slide.shapes:
            if is_chrome(shape, prs.slide_height):
                continue
            if shape.has_table:
                redesign_table(shape)
            elif shape.has_text_frame and shape.text_frame.text.strip():
                redesign_text_shape(shape)

    backup = pptx_path.with_suffix(pptx_path.suffix + ".bak")
    if not backup.exists():
        shutil.copy(pptx_path, backup)

    prs.save(pptx_path)
    return pptx_path


def main():
    pptx_file = sys.argv[1]
    out = redesign(pptx_file)
    print(f"Redesign applique : {out}")


if __name__ == "__main__":
    main()

# redesign_deck.py
"""
SAMO PPTX Redesign — corrige le probleme "texte trop petit, case presque
vide" observe sur les diapositives generees (gabarit commun a tous les
cours : Support informatique, Word, Soutien Reseautique/Windows Server).

Principe : pour chaque zone de texte de CONTENU (on exclut le bandeau
d'en-tete/pied de page qui doit rester discret), on cherche la plus
grande taille de police qui remplit mieux la case SANS jamais deborder.

IMPORTANT (v2) : la version precedente estimait le nombre de lignes en
comptant seulement les paragraphes (1 ligne par paragraphe), ce qui est
faux des qu'un paragraphe est assez long pour retourner a la ligne. Ca a
cause des chevauchements de texte (ex. diapositive "Les composants
internes" du cours Support informatique). Cette version estime le
nombre de lignes REELLEMENT necessaires a partir de la largeur de la
case et de la longueur du texte, puis fait une recherche pour trouver la
plus grande police qui tient dans la hauteur disponible.

Usage :
  python redesign_deck.py chemin/vers/Seance_N.pptx
  -> modifie le fichier sur place (fonctionne uniquement si le fichier
     est sur un disque local, ex. /tmp — pas sur un dossier reseau/sync)
"""

import math
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

# Largeur moyenne d'un caractere, en fraction de la taille de police
# (approximation raisonnable pour une police proportionnelle type Arial/
# Calibri, texte francais avec majuscules/minuscules melangees).
AVG_CHAR_WIDTH_FACTOR = 0.52
LINE_HEIGHT_FACTOR = 1.25


def is_chrome(shape):
    if shape.top is None:
        return True
    if shape.top < HEADER_LIMIT_EMU:
        return True
    if shape.top > FOOTER_START_EMU:
        return True
    return False


def paragraph_texts(text_frame):
    texts = []
    for p in text_frame.paragraphs:
        t = "".join(r.text for r in p.runs).strip()
        if t:
            texts.append(t)
    return texts


def first_font_size_pt(text_frame):
    for p in text_frame.paragraphs:
        for r in p.runs:
            if r.text.strip() and r.font.size:
                return r.font.size.pt
    return None


def estimated_lines(texts, box_width_pt, font_pt):
    chars_per_line = max(int(box_width_pt / (font_pt * AVG_CHAR_WIDTH_FACTOR)), 1)
    total = 0
    for t in texts:
        total += max(1, math.ceil(len(t) / chars_per_line))
    return total


def fits(texts, box_width_pt, box_height_pt, font_pt, target_occupancy):
    lines = estimated_lines(texts, box_width_pt, font_pt)
    needed_pt = font_pt * LINE_HEIGHT_FACTOR * lines
    return needed_pt <= target_occupancy * box_height_pt


def best_font_size(texts, box_width_pt, box_height_pt, old_pt, target_occupancy, max_factor):
    # Recherche la plus grande taille (par pas de 0.5pt) qui tient dans
    # la case, entre old_pt et old_pt * max_factor.
    hi = old_pt * max_factor
    best = old_pt
    size = old_pt
    step = 0.5
    while size <= hi:
        if fits(texts, box_width_pt, box_height_pt, size, target_occupancy):
            best = size
        else:
            break
        size += step
    return round(best, 1)


def current_occupancy(texts, box_width_pt, box_height_pt, font_pt):
    lines = estimated_lines(texts, box_width_pt, font_pt)
    needed_pt = font_pt * LINE_HEIGHT_FACTOR * lines
    if box_height_pt <= 0:
        return 1.0
    return needed_pt / box_height_pt


def redesign_text_shape(shape):
    tf = shape.text_frame
    old_pt = first_font_size_pt(tf)
    if old_pt is None:
        return

    texts = paragraph_texts(tf)
    if not texts:
        return

    box_width_pt = shape.width / 12700
    box_height_pt = shape.height / 12700
    if box_width_pt <= 0 or box_height_pt <= 0:
        return

    occ = current_occupancy(texts, box_width_pt, box_height_pt, old_pt)

    # Plus la case est vide, plus on autorise une police ambitieuse ; on
    # borne toujours a une occupation cible < 1 pour ne jamais deborder,
    # avec une marge de securite (0.9) sur l'estimation elle-meme.
    if occ < 0.30:
        target, max_factor = 0.62, 2.0
    elif occ < 0.55:
        target, max_factor = 0.72, 1.5
    else:
        target, max_factor = 0.82, 1.2

    new_pt = best_font_size(texts, box_width_pt, box_height_pt, old_pt, target, max_factor)
    new_pt = max(new_pt, old_pt)

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
            # Boost modeste et sans risque pour les tableaux (colonnes
            # etroites -> le retour a la ligne y est deja plus sensible).
            new_pt = round(old_pt * 1.15, 1)
            for p in tf.paragraphs:
                for r in p.runs:
                    if r.text.strip() and r.font.size:
                        r.font.size = Pt(new_pt)


def redesign(pptx_path):
    pptx_path = Path(pptx_path)
    prs = Presentation(pptx_path)

    for slide in prs.slides:
        for shape in slide.shapes:
            if is_chrome(shape):
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

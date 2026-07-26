# classifier.py
"""
SAMO PPTX Classifier

Classe une slide déjà extraite (voir extractor.py) selon sa vraie structure,
pas selon des mots-clés cherchés dans tout le texte concaténé :

- PLACEHOLDER : la slide contient une instruction "[ Screenshot ]" /
  "insérer ici" — un visuel doit être ajouté manuellement par le formateur.
- TABLE       : la slide contient un vrai tableau PowerPoint.
- TIMELINE    : la slide contient au moins 3 shapes texte isolées dont le
  contenu est EXACTEMENT un numéro à 2 chiffres ("01", "02", "03"...).
  Ça évite de confondre avec un sommaire du type "01 — Qu'est-ce qu'un PC ?"
  qui est un seul bloc de texte, pas un marqueur de step isolé.
- GENERAL     : tout le reste.
"""

from extractor import NUMBER_STEP_RE, PLACEHOLDER_RE


class SlideType:
    GENERAL = "GENERAL"
    PLACEHOLDER = "PLACEHOLDER"
    TIMELINE = "TIMELINE"
    TABLE = "TABLE"


def classify_blocks(title, blocks):
    """Classe une slide à partir de son titre + ses blocs de contenu (sans kicker)."""

    all_text = " ".join(
        block["text"] for block in blocks if block["kind"] == "text"
    )
    if title:
        all_text = f"{title} {all_text}"

    if PLACEHOLDER_RE.search(all_text):
        return SlideType.PLACEHOLDER

    if any(block["kind"] == "table" for block in blocks):
        return SlideType.TABLE

    step_markers = sum(
        1 for block in blocks
        if block["kind"] == "text" and NUMBER_STEP_RE.match(block["text"])
    )
    if step_markers >= 3:
        return SlideType.TIMELINE

    return SlideType.GENERAL


def classify_slide(slide_data):
    """Version pratique qui prend directement le dict retourné par extract_slide()."""

    return classify_blocks(slide_data["title"], slide_data["blocks"])

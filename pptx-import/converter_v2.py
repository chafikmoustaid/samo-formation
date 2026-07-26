# converter_v2.py
"""
SAMO PPTX Converter V2

Génère, pour un PPTX donné :
  output/seance_<n>_fidele.html       -> transcript fidèle, même rendu pour
                                          toutes les slides (titre + contenu réel)
  output/seance_<n>_pedagogique.html  -> même contenu, mais mis en forme
                                          spécifiquement selon le type de
                                          slide détecté (timeline, tableau,
                                          placeholder à compléter, etc.)

Contrairement à la V1, aucun contenu n'est codé en dur : tout vient du
texte/tableau réellement extrait de chaque slide.
"""

import html
import re
import sys
from pathlib import Path

from pptx import Presentation

from classifier import SlideType, classify_blocks
from extractor import NUMBER_STEP_RE, extract_slide, find_boilerplate_texts

STYLE = """
body{
    font-family:Arial, sans-serif;
    background:#f5f5f5;
    margin:0;
    padding:20px;
    color:#1f2933;
}
.slide{
    background:white;
    max-width:900px;
    margin:0 auto 30px auto;
    padding:28px 32px;
    border-radius:12px;
    box-shadow:0 2px 6px rgba(0,0,0,.15);
}
.slide h2{
    margin-top:0;
    color:#1b4332;
}
.slide-number{
    font-size:12px;
    color:#868e96;
    text-transform:uppercase;
    letter-spacing:.05em;
    margin-bottom:4px;
}
.slide p{
    line-height:1.5;
}

/* Timeline */
.timeline .step{
    margin:10px 0;
    padding:14px 16px;
    background:#eef7ee;
    border-left:5px solid #2f9e44;
    border-radius:4px;
}
.timeline .step .step-num{
    display:inline-block;
    background:#2f9e44;
    color:white;
    font-weight:bold;
    border-radius:50%;
    width:28px;
    height:28px;
    line-height:28px;
    text-align:center;
    margin-right:10px;
}
.timeline .step .step-label{
    font-weight:bold;
}
.timeline .step .step-note{
    color:#495057;
    font-size:14px;
    margin-top:4px;
}

/* Table */
table.samo-table{
    border-collapse:collapse;
    width:100%;
    font-size:14px;
}
table.samo-table th, table.samo-table td{
    border:1px solid #dee2e6;
    padding:8px 10px;
    text-align:left;
}
table.samo-table th{
    background:#e8f3ff;
}
table.samo-table tr:nth-child(even) td{
    background:#f8f9fa;
}

/* Placeholder */
.placeholder-box{
    border:3px dashed #6CC24A;
    border-radius:16px;
    padding:24px;
    background:#f7faf7;
}
.placeholder-box h3{
    margin-top:0;
}
"""


def esc(text):
    return html.escape(text)


def session_number(pptx_path):
    match = re.search(r"(\d+)", Path(pptx_path).stem)
    return match.group(1) if match else "1"


def render_table(rows, css_class="samo-table"):
    if not rows:
        return ""
    header, *body_rows = rows
    out = [f'<table class="{css_class}">', "<thead><tr>"]
    for cell in header:
        out.append(f"<th>{esc(cell)}</th>")
    out.append("</tr></thead><tbody>")
    for row in body_rows:
        out.append("<tr>")
        for cell in row:
            out.append(f"<td>{esc(cell)}</td>")
        out.append("</tr>")
    out.append("</tbody></table>")
    return "".join(out)


def group_timeline_steps(blocks):
    """Regroupe les blocs en (intro, steps) à partir des marqueurs '01', '02'..."""

    intro = []
    steps = []
    current = None

    for block in blocks:
        if block["kind"] == "text" and NUMBER_STEP_RE.match(block["text"]):
            current = {"num": block["text"], "lines": []}
            steps.append(current)
            continue

        if current is None:
            intro.append(block)
        else:
            if block["kind"] == "text":
                current["lines"].append(block["text"])
            else:
                current["lines"].append(None)  # ignore rare table-in-step case

    return intro, steps


def render_blocks_fidele(blocks):
    parts = []
    for block in blocks:
        if block["kind"] == "table":
            parts.append(render_table(block["rows"]))
        else:
            parts.append(f"<p>{esc(block['text'])}</p>")
    return "".join(parts)


def render_slide_fidele(index, slide_data):
    title = slide_data["title"] or f"Slide {index}"
    body = render_blocks_fidele(slide_data["blocks"])
    return (
        f'<div class="slide">'
        f'<div class="slide-number">Slide {index}</div>'
        f"<h2>{esc(title)}</h2>"
        f"{body}"
        f"</div>"
    )


def render_slide_pedagogique(index, slide_data, slide_type):
    title = slide_data["title"] or f"Slide {index}"
    blocks = slide_data["blocks"]

    if slide_type == SlideType.PLACEHOLDER:
        body_text = render_blocks_fidele(blocks)
        inner = (
            f'<div class="placeholder-box">'
            f"<h3>📷 {esc(title)}</h3>"
            f"{body_text}"
            f"</div>"
        )
        extra_class = ""

    elif slide_type == SlideType.TABLE:
        table_block = next((b for b in blocks if b["kind"] == "table"), None)
        other_text = [b for b in blocks if b["kind"] == "text"]
        table_html = render_table(table_block["rows"]) if table_block else ""
        notes_html = "".join(f"<p>{esc(t['text'])}</p>" for t in other_text)
        inner = f"<h2>{esc(title)}</h2>{table_html}{notes_html}"
        extra_class = " table-slide"

    elif slide_type == SlideType.TIMELINE:
        intro, steps = group_timeline_steps(blocks)
        intro_html = render_blocks_fidele(intro)
        steps_html = []
        for step in steps:
            lines = [line for line in step["lines"] if line]
            label = lines[0] if lines else ""
            rest = lines[1:]
            note_html = "".join(f'<div class="step-note">{esc(line)}</div>' for line in rest)
            steps_html.append(
                f'<div class="step">'
                f'<span class="step-num">{esc(step["num"])}</span>'
                f'<span class="step-label">{esc(label)}</span>'
                f"{note_html}"
                f"</div>"
            )
        inner = (
            f"<h2>{esc(title)}</h2>"
            f"{intro_html}"
            f'<div class="timeline">{"".join(steps_html)}</div>'
        )
        extra_class = " timeline"

    else:  # GENERAL
        inner = f"<h2>{esc(title)}</h2>{render_blocks_fidele(blocks)}"
        extra_class = ""

    return (
        f'<div class="slide{extra_class}">'
        f'<div class="slide-number">Slide {index}</div>'
        f"{inner}"
        f"</div>"
    )


def build_html(body_html, page_title):
    return (
        "<!DOCTYPE html>\n"
        "<html lang=\"fr\">\n<head>\n"
        '<meta charset="utf-8">\n'
        f"<title>{esc(page_title)}</title>\n"
        f"<style>{STYLE}</style>\n"
        "</head>\n<body>\n"
        f"{body_html}\n"
        "</body>\n</html>\n"
    )


def convert(pptx_path):
    prs = Presentation(pptx_path)
    boilerplate = find_boilerplate_texts(prs)

    fidele_parts = []
    pedagogique_parts = []

    for index, slide in enumerate(prs.slides, start=1):
        slide_data = extract_slide(slide, boilerplate)
        slide_type = classify_blocks(slide_data["title"], slide_data["blocks"])

        fidele_parts.append(render_slide_fidele(index, slide_data))
        pedagogique_parts.append(render_slide_pedagogique(index, slide_data, slide_type))

    n = session_number(pptx_path)
    fidele_html = build_html("\n".join(fidele_parts), f"Séance {n} — Fidèle")
    pedagogique_html = build_html("\n".join(pedagogique_parts), f"Séance {n} — Pédagogique")

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    fidele_path = output_dir / f"seance_{n}_fidele.html"
    pedagogique_path = output_dir / f"seance_{n}_pedagogique.html"

    fidele_path.write_text(fidele_html, encoding="utf-8")
    pedagogique_path.write_text(pedagogique_html, encoding="utf-8")

    return fidele_path, pedagogique_path


def main():
    pptx_file = sys.argv[1]
    fidele_path, pedagogique_path = convert(pptx_file)
    print(f"HTML fidèle généré      : {fidele_path}")
    print(f"HTML pédagogique généré : {pedagogique_path}")


if __name__ == "__main__":
    main()

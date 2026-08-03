# render_slides.py
"""
SAMO PPTX Slide Renderer

Convertit CHAQUE slide du PPTX en image, pixel pour pixel identique au
fichier PowerPoint original (polices, couleurs, positions, icônes...),
et produit un fichier HTML autonome (images encodées en base64 : aucun
fichier séparé à héberger ou à partager) :

  output/seance_<n>_fidele.html

Contrairement à converter_v2.py (qui RECONSTRUIT le contenu en HTML),
ce script prend une capture fidèle de chaque slide via LibreOffice +
Poppler. C'est la version "identique à l'original".

Dépendances système (à installer une seule fois) :
  - LibreOffice (fournit la commande `soffice`)
  - Poppler (fournit la commande `pdftoppm`)

Usage :
  python render_slides.py uploads/Seance_1_Introduction_Informatique.pptx
"""

import base64
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DPI = 110  # qualité d'image ; assez net à l'écran, tout en restant sous
           # la limite de taille de charge utile des fonctions Vercel (~4.5 Mo)


def session_number(pptx_path):
    match = re.search(r"(\d+)", Path(pptx_path).stem)
    return match.group(1) if match else "1"


def check_dependencies():
    missing = [cmd for cmd in ("soffice", "pdftoppm") if shutil.which(cmd) is None]
    if missing:
        raise SystemExit(
            "Outils manquants : " + ", ".join(missing) + "\n"
            "Installe LibreOffice (soffice) et Poppler (pdftoppm), "
            "puis relance cette commande."
        )


def pptx_to_pdf(pptx_path, tmp_dir):
    subprocess.run(
        [
            "soffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(tmp_dir),
            str(pptx_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    pdf_path = tmp_dir / (Path(pptx_path).stem + ".pdf")
    if not pdf_path.exists():
        raise RuntimeError("La conversion PPTX -> PDF a échoué.")
    return pdf_path


def pdf_to_images(pdf_path, tmp_dir):
    prefix = tmp_dir / "slide"
    subprocess.run(
        [
            "pdftoppm",
            "-jpeg",
            "-jpegopt", "quality=80,optimize=y",
            "-r", str(DPI),
            str(pdf_path),
            str(prefix),
        ],
        check=True,
    )
    return sorted(tmp_dir.glob("slide-*.jpg"))


def build_html(image_paths, page_title):
    slides_html = []
    for image_path in image_paths:
        encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
        slides_html.append(
            f'<div class="slide-shot">'
            f'<img src="data:image/jpeg;base64,{encoded}" '
            f'alt="" draggable="false" oncontextmenu="return false">'
            f"</div>"
        )

    style = """
    body{
        font-family:Arial, sans-serif;
        background:#e9ecef;
        margin:0;
        padding:20px;
    }
    .slide-shot{
        max-width:1000px;
        margin:0 auto 24px auto;
        box-shadow:0 2px 10px rgba(0,0,0,.2);
        border-radius:8px;
        overflow:hidden;
        line-height:0;
    }
    .slide-shot img{
        width:100%;
        display:block;
        -webkit-user-drag:none;
        user-select:none;
        pointer-events:none;
    }
    """

    return (
        "<!DOCTYPE html>\n"
        '<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
        f"<title>{page_title}</title>\n"
        f"<style>{style}</style>\n"
        "</head>\n"
        '<body oncontextmenu="return false">\n'
        f"{''.join(slides_html)}\n"
        "</body>\n</html>\n"
    )


def render(pptx_path):
    check_dependencies()
    pptx_path = Path(pptx_path)
    n = session_number(pptx_path)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        pdf_path = pptx_to_pdf(pptx_path, tmp_dir)
        image_paths = pdf_to_images(pdf_path, tmp_dir)

        if not image_paths:
            raise RuntimeError("Aucune image générée à partir du PDF.")

        html = build_html(image_paths, f"Séance {n} — Fidèle (original)")

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"seance_{n}_fidele.html"
    output_path.write_text(html, encoding="utf-8")

    return output_path, len(image_paths)


def main():
    pptx_file = sys.argv[1]
    output_path, count = render(pptx_file)
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"HTML fidèle (images) généré : {output_path}")
    print(f"{count} slides · {size_mb:.1f} Mo")


if __name__ == "__main__":
    main()

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { calculHeures, LigneFiche } from "@/lib/fichePresence";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await context.params;
  const supabase = supabaseFromRequest(request);

  const { data: fiche, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !fiche) {
    return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
  }

  const lignes: LigneFiche[] = Array.isArray(fiche.lignes) ? fiche.lignes : [];

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const GRIS_ENTETE: [number, number, number] = [229, 231, 235]; // gray-200
  const GRIS_CLAIR: [number, number, number] = [243, 244, 246]; // gray-100
  const GRIS_BORDURE: [number, number, number] = [156, 163, 175]; // gray-400

  const logoPath = path.join(process.cwd(), "public", "logo-samo.png");

  if (fs.existsSync(logoPath)) {
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    pdf.addImage(`data:image/png;base64,${logoBase64}`, "PNG", 15, 12, 24, 7.4);
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("FICHE DE PRÉSENCE", 195, 20, { align: "right" });

  pdf.setFontSize(10);

  const labelX = 15;
  const boxX = 62;
  const boxW = 70;
  const boxH = 6;

  pdf.setFont("helvetica", "bold");
  pdf.text("Nom de l'étudiant(e) :", labelX, 42);
  pdf.setFillColor(...GRIS_CLAIR);
  pdf.setDrawColor(...GRIS_BORDURE);
  pdf.rect(boxX, 38.5, boxW, boxH, "FD");
  pdf.setFont("helvetica", "normal");
  pdf.text(String(fiche.nom_etudiant ?? ""), boxX + 2, 42.5);

  pdf.setFont("helvetica", "bold");
  pdf.text("Nom du formateur(trice) :", labelX, 51);
  pdf.setFillColor(...GRIS_CLAIR);
  pdf.rect(boxX, 47.5, boxW, boxH, "FD");
  pdf.setFont("helvetica", "normal");
  pdf.text(String(fiche.nom_formateur ?? ""), boxX + 2, 51.5);

  pdf.setDrawColor(0, 0, 0);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  const instructions =
    "Cette fiche devra être complétée et signée par l'étudiant(e) et remise au formateur(trice) à la fin de la semaine ou à la fin de la matière. " +
    "Cette fiche devra ensuite être acheminée et signée par le formateur(trice) à l'administration au plus tard le lundi suivant la semaine en cours.";
  const wrapped = pdf.splitTextToSize(instructions, 180);
  pdf.rect(15, 55, 180, 14);
  pdf.text(wrapped, 17, 60);

  // --- Tableau ---
  const x0 = 15;
  let y = 75;

  const colW = {
    jour: 12,
    date: 18,
    matiere: 42,
    lp: 8,
    fDe: 13,
    fA: 13,
    fTot: 13,
    pDe: 13,
    pA: 13,
    pTot: 13,
  };
  const cols = Object.values(colW);
  const tableWidth = cols.reduce((a, b) => a + b, 0);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(0, 0, 0);

  // En-tête ligne 1
  const h1 = 6;
  let x = x0;
  const headerLabels1: [string, number][] = [
    ["", colW.jour],
    ["Date", colW.date],
    ["Matières", colW.matiere],
    ["L/P", colW.lp],
    ["Formation", colW.fDe + colW.fA + colW.fTot],
    ["Pratique", colW.pDe + colW.pA + colW.pTot],
  ];
  pdf.setFillColor(...GRIS_ENTETE);
  pdf.setDrawColor(...GRIS_BORDURE);
  headerLabels1.forEach(([label, w]) => {
    pdf.rect(x, y, w, h1, "FD");
    if (label) pdf.text(label, x + w / 2, y + h1 / 2 + 1.2, { align: "center" });
    x += w;
  });
  y += h1;

  // En-tête ligne 2
  const h2 = 5;
  x = x0 + colW.jour + colW.date + colW.matiere + colW.lp;
  pdf.rect(x0, y, colW.jour + colW.date + colW.matiere + colW.lp, h2, "FD");
  const subLabels: [string, number][] = [
    ["De", colW.fDe],
    ["À", colW.fA],
    ["Total", colW.fTot],
    ["De", colW.pDe],
    ["À", colW.pA],
    ["Total", colW.pTot],
  ];
  subLabels.forEach(([label, w]) => {
    pdf.rect(x, y, w, h2, "FD");
    pdf.text(label, x + w / 2, y + h2 / 2 + 1, { align: "center" });
    x += w;
  });
  y += h2;
  pdf.setDrawColor(0, 0, 0);

  // Lignes de données
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);

  const hRow = 6;
  let indexDansJournee = 0;

  lignes.forEach((ligne, idx) => {
    x = x0;
    const estPremiereLigne = idx % 2 === 0;

    if (estPremiereLigne) {
      pdf.setFillColor(...GRIS_ENTETE);
      pdf.setDrawColor(...GRIS_BORDURE);
      pdf.rect(x, y, colW.jour, hRow * 2, "FD");
      pdf.setDrawColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text(ligne.jour ?? "", x + 1.5, y + hRow + 1);
      pdf.setFont("helvetica", "normal");
    }
    x += colW.jour;

    pdf.rect(x, y, colW.date, hRow);
    pdf.text(ligne.date ?? "", x + 1.5, y + hRow / 2 + 1);
    x += colW.date;

    pdf.rect(x, y, colW.matiere, hRow);
    pdf.text((ligne.matiere ?? "").slice(0, 30), x + 1.5, y + hRow / 2 + 1);
    x += colW.matiere;

    pdf.rect(x, y, colW.lp, hRow);
    pdf.text(ligne.type ?? "", x + colW.lp / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.lp;

    const fTotal = calculHeures(ligne.formationDe, ligne.formationA);
    pdf.rect(x, y, colW.fDe, hRow);
    pdf.text(ligne.formationDe ?? "", x + colW.fDe / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.fDe;

    pdf.rect(x, y, colW.fA, hRow);
    pdf.text(ligne.formationA ?? "", x + colW.fA / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.fA;

    pdf.setFillColor(...GRIS_CLAIR);
    pdf.rect(x, y, colW.fTot, hRow, "FD");
    pdf.text(fTotal ? String(fTotal) : "", x + colW.fTot / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.fTot;

    const pTotal = calculHeures(ligne.pratiqueDe, ligne.pratiqueA);
    pdf.rect(x, y, colW.pDe, hRow);
    pdf.text(ligne.pratiqueDe ?? "", x + colW.pDe / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.pDe;

    pdf.rect(x, y, colW.pA, hRow);
    pdf.text(ligne.pratiqueA ?? "", x + colW.pA / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.pA;

    pdf.setFillColor(...GRIS_CLAIR);
    pdf.rect(x, y, colW.pTot, hRow, "FD");
    pdf.text(pTotal ? String(pTotal) : "", x + colW.pTot / 2, y + hRow / 2 + 1, {
      align: "center",
    });

    y += hRow;
    indexDansJournee++;
  });

  // Ligne TOTAL
  pdf.setFont("helvetica", "bold");
  pdf.setFillColor(...GRIS_ENTETE);
  pdf.setDrawColor(...GRIS_BORDURE);
  x = x0;
  pdf.rect(x, y, colW.jour + colW.date + colW.matiere + colW.lp, hRow, "FD");
  pdf.text(
    "TOTAL",
    x + (colW.jour + colW.date + colW.matiere + colW.lp) / 2,
    y + hRow / 2 + 1,
    { align: "center" }
  );
  x += colW.jour + colW.date + colW.matiere + colW.lp;

  pdf.rect(x, y, colW.fDe + colW.fA, hRow, "FD");
  x += colW.fDe + colW.fA;
  pdf.rect(x, y, colW.fTot, hRow, "FD");
  pdf.text(String(fiche.total_formation ?? 0), x + colW.fTot / 2, y + hRow / 2 + 1, {
    align: "center",
  });
  x += colW.fTot;

  pdf.rect(x, y, colW.pDe + colW.pA, hRow, "FD");
  x += colW.pDe + colW.pA;
  pdf.rect(x, y, colW.pTot, hRow, "FD");
  pdf.text(String(fiche.total_pratique ?? 0), x + colW.pTot / 2, y + hRow / 2 + 1, {
    align: "center",
  });
  pdf.setDrawColor(0, 0, 0);

  y += hRow + 6;

  // Motif écart d'heures
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setFillColor(...GRIS_ENTETE);
  pdf.rect(x0, y, tableWidth, 6, "FD");
  pdf.text("SI PLUS OU MOINS D'HEURES, INSCRIRE LE MOTIF", x0 + tableWidth / 2, y + 4, {
    align: "center",
  });
  y += 6;
  pdf.rect(x0, y, tableWidth, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  if (fiche.motif_heures) {
    pdf.text(pdf.splitTextToSize(String(fiche.motif_heures), tableWidth - 4), x0 + 2, y + 5);
  }
  y += 18;

  // Confirmation
  pdf.setDrawColor(0);
  pdf.rect(x0, y, 4, 4);
  if (fiche.confirmation) {
    pdf.setFont("helvetica", "bold");
    pdf.text("X", x0 + 0.8, y + 3.2);
  }
  pdf.setTextColor(180, 30, 30);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    pdf.splitTextToSize(
      "Je confirme avoir vérifié quotidiennement l'exactitude des informations inscrites sur cette fiche de présence avant sa signature et son envoi.",
      tableWidth - 8
    ),
    x0 + 6,
    y + 3
  );
  pdf.setTextColor(0, 0, 0);

  y += 16;

  // Signatures
  const sigW = tableWidth / 2 - 2;
  const sigH = 26;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Signature de l'étudiant(e)", x0 + sigW / 2, y, { align: "center" });
  pdf.text("Signature du formateur(trice)", x0 + sigW + 4 + sigW / 2, y, {
    align: "center",
  });
  y += 3;

  function dessinerSignature(
    x: number,
    largeur: number,
    image: string | null,
    nom: string | null,
    dateIso: string | null
  ) {
    pdf.setDrawColor(0);
    pdf.rect(x, y, largeur, sigH);

    if (!image) return;

    const imageW = largeur * 0.6;
    const texteX = x + imageW + 2;
    const texteW = largeur - imageW - 4;

    try {
      pdf.addImage(image, "PNG", x + 2, y + 2, imageW - 4, sigH - 4);
    } catch {
      // signature invalide, on l'ignore
    }

    pdf.setDrawColor(210, 210, 210);
    pdf.line(x + imageW, y + 2, x + imageW, y + sigH - 2);

    pdf.setTextColor(90, 90, 90);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);

    let ligneY = y + 6;
    pdf.text(pdf.splitTextToSize("Signature numérique de", texteW), texteX, ligneY);
    ligneY += 4.5;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(pdf.splitTextToSize(nom ?? "", texteW), texteX, ligneY);
    ligneY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    const dateTexte = dateIso
      ? new Date(dateIso).toLocaleString("fr-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";
    pdf.text(pdf.splitTextToSize(`Date : ${dateTexte}`, texteW), texteX, ligneY);

    pdf.setTextColor(0, 0, 0);
  }

  dessinerSignature(
    x0,
    sigW,
    fiche.signature_etudiant ?? null,
    fiche.nom_etudiant ?? null,
    fiche.date_signature_etudiant ?? null
  );

  dessinerSignature(
    x0 + sigW + 4,
    sigW,
    fiche.signature_formateur ?? null,
    fiche.nom_formateur ?? null,
    fiche.date_signature_formateur ?? null
  );

  const buffer = pdf.output("arraybuffer");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fiche-${id}.pdf"`,
    },
  });
}

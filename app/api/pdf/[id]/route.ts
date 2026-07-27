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

  const logoPath = path.join(process.cwd(), "public", "logo-samo.png");

  if (fs.existsSync(logoPath)) {
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    pdf.addImage(`data:image/png;base64,${logoBase64}`, "PNG", 15, 12, 28, 8.6);
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("FICHE DE PRÉSENCE", 105, 30, { align: "center" });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Nom de l'étudiant(e) :", 15, 42);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(fiche.nom_etudiant ?? ""), 62, 42);

  pdf.setFont("helvetica", "normal");
  pdf.text("Nom du formateur(trice) :", 15, 49);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(fiche.nom_formateur ?? ""), 62, 49);

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
  headerLabels1.forEach(([label, w]) => {
    pdf.rect(x, y, w, h1);
    if (label) pdf.text(label, x + w / 2, y + h1 / 2 + 1.2, { align: "center" });
    x += w;
  });
  y += h1;

  // En-tête ligne 2
  const h2 = 5;
  x = x0 + colW.jour + colW.date + colW.matiere + colW.lp;
  pdf.rect(x0, y, colW.jour + colW.date + colW.matiere + colW.lp, h2);
  const subLabels: [string, number][] = [
    ["De", colW.fDe],
    ["À", colW.fA],
    ["Total", colW.fTot],
    ["De", colW.pDe],
    ["À", colW.pA],
    ["Total", colW.pTot],
  ];
  subLabels.forEach(([label, w]) => {
    pdf.rect(x, y, w, h2);
    pdf.text(label, x + w / 2, y + h2 / 2 + 1, { align: "center" });
    x += w;
  });
  y += h2;

  // Lignes de données
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);

  const hRow = 6;
  let indexDansJournee = 0;

  lignes.forEach((ligne) => {
    x = x0;
    const estPremiereLigne = ligne.type === "P";

    if (estPremiereLigne) {
      pdf.rect(x, y, colW.jour, hRow * 2);
      pdf.setFont("helvetica", "bold");
      pdf.text(ligne.jour ?? "", x + colW.jour / 2, y + hRow + 1, {
        align: "center",
      });
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

    pdf.rect(x, y, colW.fTot, hRow);
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

    pdf.rect(x, y, colW.pTot, hRow);
    pdf.text(pTotal ? String(pTotal) : "", x + colW.pTot / 2, y + hRow / 2 + 1, {
      align: "center",
    });

    y += hRow;
    indexDansJournee++;
  });

  // Ligne TOTAL
  pdf.setFont("helvetica", "bold");
  x = x0;
  pdf.rect(x, y, colW.jour + colW.date + colW.matiere + colW.lp, hRow);
  pdf.text(
    "TOTAL",
    x + (colW.jour + colW.date + colW.matiere + colW.lp) / 2,
    y + hRow / 2 + 1,
    { align: "center" }
  );
  x += colW.jour + colW.date + colW.matiere + colW.lp;

  pdf.rect(x, y, colW.fDe + colW.fA, hRow);
  x += colW.fDe + colW.fA;
  pdf.rect(x, y, colW.fTot, hRow);
  pdf.text(String(fiche.total_formation ?? 0), x + colW.fTot / 2, y + hRow / 2 + 1, {
    align: "center",
  });
  x += colW.fTot;

  pdf.rect(x, y, colW.pDe + colW.pA, hRow);
  x += colW.pDe + colW.pA;
  pdf.rect(x, y, colW.pTot, hRow);
  pdf.text(String(fiche.total_pratique ?? 0), x + colW.pTot / 2, y + hRow / 2 + 1, {
    align: "center",
  });

  y += hRow + 6;

  // Motif écart d'heures
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.rect(x0, y, tableWidth, 6);
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
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Signature de l'étudiant(e)", x0 + sigW / 2, y, { align: "center" });
  pdf.text("Signature du formateur(trice)", x0 + sigW + 4 + sigW / 2, y, {
    align: "center",
  });
  y += 3;

  pdf.rect(x0, y, sigW, 25);
  pdf.rect(x0 + sigW + 4, y, sigW, 25);

  if (fiche.signature_etudiant) {
    try {
      pdf.addImage(fiche.signature_etudiant, "PNG", x0 + 2, y + 2, sigW - 4, 21);
    } catch {
      // signature invalide, on l'ignore
    }
  }

  if (fiche.signature_formateur) {
    try {
      pdf.addImage(
        fiche.signature_formateur,
        "PNG",
        x0 + sigW + 6,
        y + 2,
        sigW - 4,
        21
      );
    } catch {
      // signature invalide, on l'ignore
    }
  }

  const buffer = pdf.output("arraybuffer");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fiche-${id}.pdf"`,
    },
  });
}

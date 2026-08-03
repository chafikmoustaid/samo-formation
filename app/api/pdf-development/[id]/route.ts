import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { LigneDeveloppement, calculHeuresLigne } from "@/lib/ficheDeveloppement";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = supabaseFromRequest(request);

  const { data: fiche, error } = await supabase
    .from("development_sheets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !fiche) {
    return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
  }

  const lignes: LigneDeveloppement[] = Array.isArray(fiche.lignes) ? fiche.lignes : [];

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const GRIS_ENTETE: [number, number, number] = [200, 200, 200];
  const GRIS_CLAIR: [number, number, number] = [240, 240, 240];

  const logoPath = path.join(process.cwd(), "public", "logo-samo.png");
  if (fs.existsSync(logoPath)) {
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    pdf.addImage(`data:image/png;base64,${logoBase64}`, "PNG", 15, 10, 36, 10.8);
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("FICHE DE DÉVELOPPEMENT", 105, 32, { align: "center" });

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.text(
    "Devra être complétée et acheminée à l'administration pour chaque période autorisée.",
    105,
    38,
    { align: "center" }
  );

  const x0 = 15;
  const labelX = x0;
  const boxX = 75;
  const boxW = 120;
  const boxH = 6.5;
  let y = 48;

  function champ(label: string, valeur: string, hauteur = boxH) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(label, labelX, y + hauteur - 2.2);
    pdf.setFillColor(...GRIS_CLAIR);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(boxX, y, boxW, hauteur, "FD");
    pdf.setFont("helvetica", "normal");
    const wrapped = pdf.splitTextToSize(valeur || "", boxW - 4);
    pdf.text(wrapped, boxX + 2, y + 4.3);
    y += hauteur + 2.5;
  }

  champ("Nom du(de la) formateur(trice) :", String(fiche.nom_formateur ?? ""));
  champ("Sujet du développement :", String(fiche.sujet ?? ""), 14);
  champ("Approuvé par :", String(fiche.approuve_par ?? ""));
  champ(
    "Nombre d'heures autorisées :",
    fiche.heures_autorisees != null ? String(fiche.heures_autorisees) : ""
  );
  champ(
    "Détail des heures réalisées à ce jour :",
    String(fiche.heures_realisees_texte ?? "")
  );
  champ(
    "Date de remise des travaux :",
    fiche.date_remise
      ? new Date(`${fiche.date_remise}T00:00:00`).toLocaleDateString("fr-CA")
      : ""
  );

  y += 3;

  // --- Tableau des journées ---
  const colW = { date: 45, debut: 40, fin: 40, total: 45 };
  const tableWidth = colW.date + colW.debut + colW.fin + colW.total;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setDrawColor(0, 0, 0);

  let x = x0;
  const entetes: [string, number][] = [
    ["Date", colW.date],
    ["Heure de début", colW.debut],
    ["Heure de fin", colW.fin],
    ["Total", colW.total],
  ];
  const hEntete = 7;
  entetes.forEach(([label, w]) => {
    pdf.setFillColor(...GRIS_ENTETE);
    pdf.rect(x, y, w, hEntete, "FD");
    pdf.text(label, x + w / 2, y + hEntete / 2 + 1.2, { align: "center" });
    x += w;
  });
  y += hEntete;

  pdf.setFont("helvetica", "normal");
  const hRow = 7;

  lignes.forEach((ligne) => {
    x = x0;
    pdf.rect(x, y, colW.date, hRow);
    pdf.text(
      ligne.date ? new Date(`${ligne.date}T00:00:00`).toLocaleDateString("fr-CA") : "",
      x + colW.date / 2,
      y + hRow / 2 + 1,
      { align: "center" }
    );
    x += colW.date;

    pdf.rect(x, y, colW.debut, hRow);
    pdf.text(ligne.heureDebut ?? "", x + colW.debut / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.debut;

    pdf.rect(x, y, colW.fin, hRow);
    pdf.text(ligne.heureFin ?? "", x + colW.fin / 2, y + hRow / 2 + 1, {
      align: "center",
    });
    x += colW.fin;

    pdf.setFillColor(...GRIS_CLAIR);
    pdf.rect(x, y, colW.total, hRow, "FD");
    pdf.text(String(calculHeuresLigne(ligne)), x + colW.total / 2, y + hRow / 2 + 1, {
      align: "center",
    });

    y += hRow;
  });

  pdf.setFont("helvetica", "bold");
  x = x0;
  pdf.setFillColor(...GRIS_ENTETE);
  pdf.rect(x, y, colW.date + colW.debut + colW.fin, hRow, "FD");
  pdf.text(
    "Nombre total des heures",
    x + (colW.date + colW.debut + colW.fin) / 2,
    y + hRow / 2 + 1,
    { align: "center" }
  );
  x += colW.date + colW.debut + colW.fin;
  pdf.setFillColor(...GRIS_CLAIR);
  pdf.rect(x, y, colW.total, hRow, "FD");
  pdf.text(`${fiche.total_heures ?? 0} h`, x + colW.total / 2, y + hRow / 2 + 1, {
    align: "center",
  });

  y += hRow + 12;

  // --- Signature ---
  const sigW = tableWidth;
  const sigH = 28;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Signature", x0 + sigW / 2, y, { align: "center" });
  y += 3;

  pdf.setDrawColor(0);
  pdf.rect(x0, y, sigW, sigH);

  if (fiche.signature_formateur) {
    const imageW = sigW * 0.4;
    try {
      pdf.addImage(fiche.signature_formateur, "PNG", x0 + 2, y + 2, imageW - 4, sigH - 4);
    } catch {
      // signature invalide, on l'ignore
    }

    const texteX = x0 + imageW + 2;
    const texteW = sigW - imageW - 4;

    // Même encadré mis en valeur que sur la fiche de présence : fond
    // teinté + bordure verte, pour que l'information soit facile à
    // repérer et vérifier par les clients (organismes).
    const VERT_SAMO: [number, number, number] = [45, 106, 79];
    pdf.setFillColor(240, 247, 243);
    pdf.setDrawColor(...VERT_SAMO);
    pdf.roundedRect(x0 + imageW + 1, y + 1.5, sigW - imageW - 2, sigH - 3, 1, 1, "FD");

    pdf.setTextColor(...VERT_SAMO);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    let ligneY = y + 7.5;
    pdf.text(pdf.splitTextToSize("Signature numérique vérifiée", texteW - 3), texteX + 1.5, ligneY);
    ligneY += 5.5;

    pdf.setFontSize(9);
    pdf.text(
      pdf.splitTextToSize(String(fiche.nom_formateur ?? ""), texteW - 3),
      texteX + 1.5,
      ligneY
    );
    ligneY += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    const dateTexte = fiche.date_signature_formateur
      ? new Date(fiche.date_signature_formateur).toLocaleString("fr-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";
    pdf.text(`Date : ${dateTexte}`, texteX + 1.5, ligneY);
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
  }

  y += sigH + 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  const statutLabels: Record<string, string> = {
    en_attente: "En attente de validation",
    validee: "Validée",
    refusee: "Refusée",
  };
  pdf.text(
    `Statut : ${statutLabels[fiche.statut] ?? fiche.statut}`,
    x0,
    y
  );

  if (fiche.statut === "refusee") {
    y += 6;

    const tableWidthDev = 180;
    const motifH = 16;
    pdf.setDrawColor(180, 30, 30);
    pdf.setFillColor(253, 242, 242);
    pdf.rect(x0, y, tableWidthDev, motifH, "FD");

    pdf.setTextColor(180, 30, 30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Motif du refus :", x0 + 2, y + 5);

    pdf.setFont("helvetica", "normal");
    pdf.text(
      pdf.splitTextToSize(
        String(fiche.motif || "Aucun motif renseigné."),
        tableWidthDev - 4
      ),
      x0 + 2,
      y + 10
    );

    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
  }

  const buffer = pdf.output("arraybuffer");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fiche-developpement-${id}.pdf"`,
    },
  });
}

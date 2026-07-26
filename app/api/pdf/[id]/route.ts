import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await context.params;

  const { data: fiche, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !fiche) {
    return NextResponse.json(
      { error: "Fiche introuvable" },
      { status: 404 }
    );
  }

 const pdf = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
});

const logoPath = path.join(
  process.cwd(),
  "public",
  "logo-samo.png"
);

if (fs.existsSync(logoPath)) {
  const logoBase64 = fs
    .readFileSync(logoPath)
    .toString("base64");

  pdf.addImage(
    `data:image/png;base64,${logoBase64}`,
    "PNG",
    15,
    12,
    30,
    30
  );
}

pdf.setDrawColor(0, 128, 0);
pdf.setLineWidth(0.5);
pdf.rect(10, 10, 190, 277);

pdf.setFontSize(22);
pdf.setTextColor(0, 128, 0);
pdf.text("FICHE DE PRESENCE SAMO", 55, 22);

pdf.setTextColor(0, 0, 0);
pdf.setFontSize(12);

  pdf.text(
    `Etudiant : ${fiche.nom_etudiant ?? ""}`,
    20,
    40
  );

  pdf.text(
    `Formateur : ${fiche.nom_formateur ?? ""}`,
    20,
    50
  );

  pdf.text(
    `Matiere : ${fiche.matiere ?? ""}`,
    20,
    60
  );

  pdf.text(
    `Semaine du : ${fiche.semaine_debut ?? ""}`,
    20,
    70
  );

  pdf.text(
    `Au : ${fiche.semaine_fin ?? ""}`,
    20,
    80
  );

pdf.setFontSize(16);
pdf.text("HEURES", 20, 95);

pdf.setFontSize(12);

pdf.text(`Lundi : ${fiche.lundi} h`, 25, 110);
pdf.text(`Mardi : ${fiche.mardi} h`, 25, 120);
pdf.text(`Mercredi : ${fiche.mercredi} h`, 25, 130);
pdf.text(`Jeudi : ${fiche.jeudi} h`, 25, 140);
pdf.text(`Vendredi : ${fiche.vendredi} h`, 25, 150);

  pdf.setFontSize(14);

pdf.setFontSize(16);

pdf.text(
  `TOTAL SEMAINE : ${fiche.total_heures} h`,
  20,
  170
);

  pdf.setFontSize(12);

  pdf.text(
    `Date signature etudiant : ${
      fiche.date_signature_etudiant ?? "-"
    }`,
    20,
    180
  );

  pdf.text(
    `Date signature formateur : ${
      fiche.date_signature_formateur ?? "-"
    }`,
    20,
    190
  );

if (fiche.signature_etudiant) {
  pdf.setFontSize(14);
  pdf.text("Signature etudiant", 20, 210);

  pdf.addImage(
    fiche.signature_etudiant,
    "PNG",
    20,
    215,
    60,
    25
  );
}

if (fiche.signature_formateur) {
  pdf.setFontSize(14);
  pdf.text("Signature formateur", 110, 210);

  pdf.addImage(
    fiche.signature_formateur,
    "PNG",
    110,
    215,
    60,
    25
  );
}
  const buffer = pdf.output("arraybuffer");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `attachment; filename="fiche-${id}.pdf"`,
    },
  });
}
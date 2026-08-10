import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";

const VERT_SAMO: [number, number, number] = [45, 106, 79];
const GRIS_ENTETE: [number, number, number] = [200, 200, 200];
const GRIS_CLAIR: [number, number, number] = [245, 245, 245];

// Retire les caractères invalides dans un nom de fichier (Windows/macOS).
function nettoyerNomFichier(nom: string): string {
  return nom.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

type Entree = {
  id: number;
  session_id: number;
  date_seance: string;
  heure_debut: string | null;
  heure_fin: string | null;
  theorie_donnee: string | null;
  pratiques_exercices: string | null;
  evaluations_notees: string | null;
  notes: string | null;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = supabaseFromRequest(request);

  const { data: feuille, error } = await supabase
    .from("road_maps")
    .select("id, student_id, matiere_id, formation_id, instructor_id")
    .eq("id", id)
    .single();

  if (error || !feuille) {
    return NextResponse.json({ error: "Feuille de route introuvable" }, { status: 404 });
  }

  const [
    { data: etudiant },
    { data: formateur },
    { data: matiere },
    { data: formation },
    { data: entreesData },
  ] = await Promise.all([
    supabase.from("profiles").select("nom_complet, email").eq("id", feuille.student_id).single(),
    supabase.from("profiles").select("nom_complet, email").eq("id", feuille.instructor_id).single(),
    supabase.from("matieres").select("nom").eq("id", feuille.matiere_id).single(),
    feuille.formation_id
      ? supabase.from("formations").select("nom").eq("id", feuille.formation_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("road_map_entries")
      .select(
        "id, session_id, date_seance, heure_debut, heure_fin, theorie_donnee, pratiques_exercices, evaluations_notees, notes"
      )
      .eq("road_map_id", feuille.id),
  ]);

  const idsSeances = (entreesData ?? []).map((e) => e.session_id);
  const { data: seancesData } = idsSeances.length
    ? await supabase.from("sessions").select("id, numero, titre").in("id", idsSeances)
    : { data: [] };

  const seances = new Map<number, { numero: number; titre: string }>();
  (seancesData ?? []).forEach((s) => seances.set(s.id, { numero: s.numero, titre: s.titre }));

  const entrees = ((entreesData as Entree[]) ?? []).sort(
    (a, b) => (seances.get(a.session_id)?.numero ?? 0) - (seances.get(b.session_id)?.numero ?? 0)
  );

  const nomEtudiant = etudiant?.nom_complet ?? etudiant?.email ?? "Étudiant";
  const nomFormateur = formateur?.nom_complet ?? formateur?.email ?? "Formateur";
  const nomMatiere = matiere?.nom ?? "Matière";
  const nomFormation = formation?.nom ?? "";

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const x0 = 15;
  const largeur = pageW - x0 * 2;
  let y = 15;

  const logoPath = path.join(process.cwd(), "public", "logo-samo.png");
  const logoBase64 = fs.existsSync(logoPath)
    ? fs.readFileSync(logoPath).toString("base64")
    : null;

  function enTeteDocument() {
    y = 15;
    if (logoBase64) {
      pdf.addImage(`data:image/png;base64,${logoBase64}`, "PNG", x0, y, 36, 10.8);
    }
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("FEUILLE DE ROUTE", pageW / 2, y + 12, { align: "center" });
    y += 22;

    pdf.setDrawColor(...VERT_SAMO);
    pdf.setFillColor(240, 247, 243);
    pdf.roundedRect(x0, y, largeur, 20, 1.5, 1.5, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...VERT_SAMO);
    pdf.text(`Étudiant(e) : ${nomEtudiant}`, x0 + 3, y + 6);
    pdf.text(`Matière : ${nomMatiere}`, x0 + 3, y + 12.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Formateur(trice) : ${nomFormateur}${nomFormation ? "   —   Formation : " + nomFormation : ""}`,
      x0 + 3,
      y + 18
    );
    pdf.setTextColor(0, 0, 0);
    y += 28;
  }

  function nouvellePage() {
    pdf.addPage();
    enTeteDocument();
  }

  function assurerEspace(hauteurNecessaire: number) {
    if (y + hauteurNecessaire > pageH - 15) {
      nouvellePage();
    }
  }

  function paragraphe(label: string, valeur: string) {
    const texte = valeur.trim() || "—";
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const wrapped = pdf.splitTextToSize(texte, largeur - 6);
    const hauteurTexte = wrapped.length * 4.2;
    const hauteurBoite = hauteurTexte + 9;

    assurerEspace(hauteurBoite);

    pdf.setDrawColor(210, 210, 210);
    pdf.setFillColor(...GRIS_CLAIR);
    pdf.rect(x0, y, largeur, hauteurBoite, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.text(label, x0 + 3, y + 4.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text(wrapped, x0 + 3, y + 9.5);
    y += hauteurBoite + 2.5;
  }

  enTeteDocument();

  if (entrees.length === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Aucune séance ajoutée à cette feuille de route.", x0, y + 5);
  }

  entrees.forEach((e, index) => {
    const seance = seances.get(e.session_id);
    const titreSeance = `Séance ${seance?.numero ?? "?"} — ${seance?.titre ?? ""}`;

    assurerEspace(16);
    if (index > 0) y += 3;

    pdf.setFillColor(...VERT_SAMO);
    pdf.rect(x0, y, largeur, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(titreSeance, x0 + 3, y + 5.5);
    pdf.setTextColor(0, 0, 0);
    y += 8 + 3;

    const dateAffichee = e.date_seance
      ? new Date(`${e.date_seance}T00:00:00`).toLocaleDateString("fr-CA")
      : "—";

    assurerEspace(8);
    const colW = largeur / 3;
    pdf.setDrawColor(210, 210, 210);
    pdf.setFillColor(...GRIS_ENTETE);
    [
      ["Date", dateAffichee],
      ["Heure de début", e.heure_debut ?? "—"],
      ["Heure de fin", e.heure_fin ?? "—"],
    ].forEach(([label, valeur], i) => {
      const bx = x0 + i * colW;
      pdf.setFillColor(...GRIS_ENTETE);
      pdf.rect(bx, y, colW, 6, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(label, bx + colW / 2, y + 4, { align: "center" });
      pdf.setFillColor(255, 255, 255);
      pdf.rect(bx, y + 6, colW, 6, "FD");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(String(valeur), bx + colW / 2, y + 10.3, { align: "center" });
    });
    y += 12 + 3;

    paragraphe("Théorie donnée", e.theorie_donnee ?? "");
    paragraphe("Pratiques / exercices (non notés)", e.pratiques_exercices ?? "");
    paragraphe("Évaluations notées", e.evaluations_notees ?? "");
    paragraphe("Remarques", e.notes ?? "");
  });

  const buffer = pdf.output("arraybuffer");

  const nomFichier = nettoyerNomFichier(`Feuille de route ${nomEtudiant} ${nomMatiere}`);
  const nomAscii = nomFichier.replace(/[^\x20-\x7E]/g, "_");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomAscii}.pdf"; filename*=UTF-8''${encodeURIComponent(
        nomFichier
      )}.pdf`,
    },
  });
}

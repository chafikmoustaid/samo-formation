import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";

export async function POST(request: Request) {
  const supabase = supabaseFromRequest(request);
  const formData = await request.formData();

  const sessionIdRaw = formData.get("session_id");
  const fideleFile = formData.get("html_fidele");
  const pedagogiqueFile = formData.get("html_pedagogique");
  const auditFile = formData.get("audit_report");

  const sessionId = Number(sessionIdRaw);

  if (!sessionIdRaw || Number.isNaN(sessionId)) {
    return NextResponse.json(
      { error: "session_id manquant ou invalide." },
      { status: 400 }
    );
  }

  if (!(fideleFile instanceof File) || !(pedagogiqueFile instanceof File)) {
    return NextResponse.json(
      { error: "Les fichiers HTML fidèle et pédagogique sont requis." },
      { status: 400 }
    );
  }

  const htmlFidele = await fideleFile.text();
  const htmlPedagogique = await pedagogiqueFile.text();

  let auditReport: unknown = null;
  let integrityScore: number | null = null;
  let couleurAccent: string | null = null;

  const HEX_COULEUR = /^#[0-9a-fA-F]{6}$/;

  if (auditFile instanceof File && auditFile.size > 0) {
    try {
      const auditText = await auditFile.text();
      auditReport = JSON.parse(auditText);

      if (
        auditReport &&
        typeof auditReport === "object" &&
        "integrity_score" in auditReport
      ) {
        const rawScore = (auditReport as Record<string, unknown>)
          .integrity_score;
        integrityScore =
          typeof rawScore === "number" ? rawScore : Number(rawScore) || null;
      }

      // Couleur extraite du thème du PowerPoint (clé "couleur_theme" dans
      // audit_report.json, ajoutée côté pipeline Python) — sert à colorer la
      // carte de cette séance dans la feuille de route (étudiant/formateur).
      if (
        auditReport &&
        typeof auditReport === "object" &&
        "couleur_theme" in auditReport
      ) {
        const rawCouleur = (auditReport as Record<string, unknown>)
          .couleur_theme;
        if (typeof rawCouleur === "string" && HEX_COULEUR.test(rawCouleur)) {
          couleurAccent = rawCouleur;
        }
      }
    } catch {
      return NextResponse.json(
        { error: "Le fichier audit_report.json est invalide (JSON illisible)." },
        { status: 400 }
      );
    }
  }

  const updatePayload: Record<string, unknown> = {
    html_fidele: htmlFidele,
    html_pedagogique: htmlPedagogique,
  };

  if (auditReport !== null) {
    updatePayload.audit_report = auditReport;
  }
  if (integrityScore !== null) {
    updatePayload.integrity_score = integrityScore;
  }
  if (couleurAccent !== null) {
    updatePayload.couleur_accent = couleurAccent;
  }

  const { data, error } = await supabase
    .from("course_lessons")
    .update(updatePayload)
    .eq("session_id", sessionId)
    .select();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        error: `Aucune ligne course_lessons avec session_id=${sessionId}. Crée d'abord la séance (titre, session_id) avant de publier son support.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, lesson: data[0] });
}

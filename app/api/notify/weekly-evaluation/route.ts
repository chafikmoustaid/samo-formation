import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const LABELS_BAREME: Record<string, string> = {
  moins_75: "Moins de 75 %",
  entre_75_80: "Entre 75 % et 80 %",
  entre_80_85: "Entre 80 % et 85 %",
  plus_85: "Plus de 85 %",
};

/**
 * Envoie le résumé de l'évaluation hebdomadaire à l'administration par
 * courriel, au moment où le formateur clique sur « Envoyer à la direction »
 * — reproduit le comportement de l'ancien formulaire Microsoft ("il est
 * envoyé directement par courriel à la direction"), mais depuis le
 * formulaire interne de l'application.
 */
export async function POST(request: Request) {
  try {
    const requester = supabaseFromRequest(request);

    const {
      data: { user },
    } = await requester.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await request.json();
    const { evaluationId } = body as { evaluationId?: number };

    if (!evaluationId) {
      return NextResponse.json({ error: "Paramètre manquant." }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: evaluation } = await admin
      .from("weekly_evaluations")
      .select("*")
      .eq("id", evaluationId)
      .single();

    if (!evaluation || evaluation.instructor_id !== user.id) {
      return NextResponse.json({ error: "Évaluation introuvable." }, { status: 404 });
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn("RESEND_API_KEY non configurée — notification ignorée.");
      return NextResponse.json({ success: true, skipped: true });
    }

    const [{ data: formateur }, { data: etudiant }, { data: matiere }, { data: admins }] =
      await Promise.all([
        admin.from("profiles").select("nom_complet, email").eq("id", evaluation.instructor_id).single(),
        admin.from("profiles").select("nom_complet, email").eq("id", evaluation.student_id).single(),
        evaluation.matiere_id
          ? admin.from("matieres").select("nom").eq("id", evaluation.matiere_id).single()
          : Promise.resolve({ data: null }),
        admin.from("profiles").select("email").eq("role", "admin"),
      ]);

    const destinataires = (admins ?? []).map((a) => a.email).filter(Boolean);
    if (destinataires.length === 0) {
      return NextResponse.json({ success: true, skipped: true, raison: "aucun admin" });
    }

    const nomFormateur = formateur?.nom_complet ?? formateur?.email ?? "Formateur";
    const nomEtudiant = etudiant?.nom_complet ?? etudiant?.email ?? "Étudiant";
    const nomMatiere = matiere?.nom ?? "—";
    const lien = `${SITE_URL}/dashboard/weekly-evaluations/${evaluation.id}`;

    function ligne(label: string, valeur: string | null | undefined) {
      if (!valeur) return "";
      return `<p><strong>${label} :</strong> ${valeur}</p>`;
    }

    await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: destinataires,
      subject: `Évaluation hebdomadaire — ${nomEtudiant} (${nomMatiere})`,
      html: `
        <p>Bonjour,</p>
        <p><strong>${nomFormateur}</strong> a soumis l'évaluation hebdomadaire de <strong>${nomEtudiant}</strong> (${nomMatiere}), séance ${
          evaluation.seance || "—"
        }, pour le ${evaluation.date_evaluation}.</p>
        ${ligne("Absences", evaluation.absences)}
        ${ligne("Retards / départs anticipés", evaluation.retards)}
        ${ligne("Bonne attitude face à la formation", evaluation.bonne_attitude)}
        ${ligne("Situation difficile / santé", evaluation.situation_difficile)}
        ${ligne("Remarques sur le matériel scolaire", evaluation.remarques_materiel)}
        ${ligne("Difficultés académiques ou d'organisation", evaluation.difficultes_academiques)}
        ${ligne(
          "Barème de performance",
          evaluation.bareme_performance ? LABELS_BAREME[evaluation.bareme_performance] : null
        )}
        ${ligne("Rythme suit l'échéancier", evaluation.rythme_echeancier)}
        <p><strong>Discuter d'une situation particulière avec la direction :</strong> ${
          evaluation.discuter_direction ? "Oui" : "Non"
        }</p>
        <p><a href="${lien}">Consulter l'évaluation complète</a></p>
        <p>— Formation SAMO</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur inconnue.";
    console.error("Erreur d'envoi de notification (évaluation hebdomadaire) :", message);
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}

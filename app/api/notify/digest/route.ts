import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";

const SEUIL_RETARD_JOURS = 7;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Résumé hebdomadaire envoyé aux administrateurs : fiches en attente de
 * validation depuis plus de SEUIL_RETARD_JOURS jours. Destiné à être
 * appelé par un cron (Vercel Cron, voir vercel.json), protégé par
 * CRON_SECRET pour éviter qu'un tiers ne déclenche l'envoi.
 */
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const fourniSecret = authHeader?.replace(/^Bearer\s+/i, "");

    if (cronSecret && fourniSecret !== cronSecret) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const resend = getResendClient();

    if (!resend) {
      console.warn("RESEND_API_KEY non configurée — résumé hebdomadaire ignoré.");
      return NextResponse.json({ success: true, skipped: true });
    }

    const seuil = new Date();
    seuil.setDate(seuil.getDate() - SEUIL_RETARD_JOURS);

    const { data: fiches } = await admin
      .from("attendance")
      .select("id, nom_etudiant, nom_formateur, created_at")
      .eq("statut", "en_attente")
      .lt("created_at", seuil.toISOString())
      .order("created_at", { ascending: true });

    if (!fiches || fiches.length === 0) {
      return NextResponse.json({ success: true, skipped: true, raison: "aucune fiche en retard" });
    }

    const { data: admins } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "admin");

    const destinataires = (admins ?? []).map((a) => a.email).filter(Boolean);

    if (destinataires.length === 0) {
      return NextResponse.json({ success: true, skipped: true, raison: "aucun admin" });
    }

    const lignes = fiches
      .map((f) => {
        const jours = Math.floor(
          (Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return `<li><a href="${SITE_URL}/attendance/${f.id}">${f.nom_etudiant}</a> — formateur : ${
          f.nom_formateur || "non assigné"
        } — en attente depuis ${jours} jours</li>`;
      })
      .join("");

    await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: destinataires,
      subject: `${fiches.length} fiche(s) de présence en attente depuis plus de ${SEUIL_RETARD_JOURS} jours`,
      html: `
        <p>Bonjour,</p>
        <p>Voici les fiches de présence en attente de validation depuis plus de ${SEUIL_RETARD_JOURS} jours :</p>
        <ul>${lignes}</ul>
        <p><a href="${SITE_URL}/dashboard">Voir le tableau de bord</a></p>
        <p>— Formation SAMO</p>
      `,
    });

    return NextResponse.json({ success: true, envoyes: destinataires.length, fiches: fiches.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur inconnue.";
    console.error("Erreur du résumé hebdomadaire :", message);
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}

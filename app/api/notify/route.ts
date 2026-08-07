import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";

type NotificationType = "creee" | "validee" | "refusee" | "validation_annulee";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    const { ficheId, type } = body as { ficheId?: string; type?: NotificationType };

    if (!ficheId || !type) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: fiche } = await admin
      .from("attendance")
      .select(
        "id, nom_etudiant, nom_formateur, user_id, formateur_id, total_heures, motif"
      )
      .eq("id", ficheId)
      .single();

    if (!fiche) {
      return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
    }

    const resend = getResendClient();

    // Pas de clé Resend configurée : on ne bloque pas le flux applicatif,
    // on log simplement et on répond succès (no-op).
    if (!resend) {
      console.warn("RESEND_API_KEY non configurée — notification ignorée.");
      return NextResponse.json({ success: true, skipped: true });
    }

    const lienFiche = `${SITE_URL}/attendance/${fiche.id}`;

    if (type === "creee") {
      if (!fiche.formateur_id) {
        return NextResponse.json({ success: true, skipped: true });
      }

      const { data: formateur } = await admin
        .from("profiles")
        .select("email")
        .eq("id", fiche.formateur_id)
        .single();

      if (!formateur?.email) {
        return NextResponse.json({ success: true, skipped: true });
      }

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: formateur.email,
        subject: `Nouvelle fiche de présence à valider — ${fiche.nom_etudiant}`,
        html: `
          <p>Bonjour,</p>
          <p><strong>${fiche.nom_etudiant}</strong> a soumis une nouvelle fiche de présence qui attend votre validation.</p>
          <p><a href="${lienFiche}">Consulter et valider la fiche</a></p>
          <p>— Formation SAMO</p>
        `,
      });

      return NextResponse.json({ success: true });
    }

    if (type === "validee" || type === "refusee") {
      if (!fiche.user_id) {
        return NextResponse.json({ success: true, skipped: true });
      }

      const { data: etudiant } = await admin
        .from("profiles")
        .select("email")
        .eq("id", fiche.user_id)
        .single();

      if (!etudiant?.email) {
        return NextResponse.json({ success: true, skipped: true });
      }

      const estValidee = type === "validee";

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: etudiant.email,
        subject: estValidee
          ? "Votre fiche de présence a été validée"
          : "Votre fiche de présence a été refusée",
        html: estValidee
          ? `
            <p>Bonjour,</p>
            <p>Votre fiche de présence (${fiche.total_heures ?? 0} h) a été validée par ${
              fiche.nom_formateur || "votre formateur(trice)"
            }.</p>
            <p><a href="${lienFiche}">Consulter la fiche</a></p>
            <p>— Formation SAMO</p>
          `
          : `
            <p>Bonjour,</p>
            <p>Votre fiche de présence a été refusée par ${
              fiche.nom_formateur || "votre formateur(trice)"
            }.</p>
            ${fiche.motif ? `<p><strong>Motif :</strong> ${fiche.motif}</p>` : ""}
            <p><a href="${lienFiche}">Consulter la fiche</a></p>
            <p>— Formation SAMO</p>
          `,
      });

      return NextResponse.json({ success: true });
    }

    if (type === "validation_annulee") {
      if (!fiche.formateur_id) {
        return NextResponse.json({ success: true, skipped: true });
      }

      const { data: formateur } = await admin
        .from("profiles")
        .select("email")
        .eq("id", fiche.formateur_id)
        .single();

      if (!formateur?.email) {
        return NextResponse.json({ success: true, skipped: true });
      }

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: formateur.email,
        subject: `Validation annulée par l'administration — ${fiche.nom_etudiant}`,
        html: `
          <p>Bonjour,</p>
          <p>La fiche de présence de <strong>${fiche.nom_etudiant}</strong> que vous aviez validée a été refusée par l'administration avant l'envoi à la paie.</p>
          ${fiche.motif ? `<p><strong>Motif :</strong> ${fiche.motif}</p>` : ""}
          <p><a href="${lienFiche}">Consulter la fiche</a></p>
          <p>— Formation SAMO</p>
        `,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Type de notification invalide." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur inconnue.";
    console.error("Erreur d'envoi de notification :", message);
    // On ne fait jamais échouer le flux applicatif à cause d'un courriel.
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}

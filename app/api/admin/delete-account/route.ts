import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Suppression définitive d'un compte : contrairement à l'archivage (qui ne
// fait que bloquer la connexion et reste réversible), ceci retire le profil
// ET le compte d'authentification. Irréversible — on préfère archiver dans
// la grande majorité des cas ; ceci n'est proposé que pour les comptes déjà
// archivés ou clairement inutiles.
//
// Les fiches de présence associées ne sont jamais perdues : nom_etudiant /
// nom_formateur / lignes y sont stockés en clair (pas une jointure vivante
// vers profiles), donc l'historique reste lisible même après suppression du
// compte. En revanche, si le compte a déjà validé des fiches en tant que
// formateur (attendance.formateur_id), la contrainte de clé étrangère
// bloque la suppression du profil — on renvoie alors une erreur claire
// invitant à archiver plutôt que supprimer.
export async function POST(request: Request) {
  try {
    const requester = supabaseFromRequest(request);

    const {
      data: { user },
      error: authError,
    } = await requester.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const { data: profil } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profil?.role !== "admin") {
      return NextResponse.json(
        { error: "Accès réservé à l'administration." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "Impossible de supprimer son propre compte." },
        { status: 400 }
      );
    }

    const { data: cible } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    const { error: erreurProfil } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (erreurProfil) {
      return NextResponse.json(
        {
          error:
            "Suppression impossible : ce compte a validé des fiches de présence en tant que formateur(trice) et ne peut pas être supprimé définitivement. Archive-le plutôt.",
        },
        { status: 409 }
      );
    }

    const { error: erreurAuth } = await admin.auth.admin.deleteUser(userId);

    if (erreurAuth) {
      return NextResponse.json({ error: erreurAuth.message }, { status: 500 });
    }

    // Journalisé après coup : le profil cible n'existe plus à ce stade, mais
    // audit_log.target_id est en ON DELETE SET NULL et target_email est
    // stocké en clair — l'entrée d'historique reste donc lisible.
    await requester.rpc("log_audit", {
      p_action: "compte_supprime",
      p_target_id: null,
      p_target_email: cible?.email ?? null,
      p_details: {},
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

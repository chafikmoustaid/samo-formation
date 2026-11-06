import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifierAccesMath } from "@/lib/mathAccess";

export const dynamic = "force-dynamic";

const TAILLE_MAX = 200_000; // octets, largement au-dessus d'un usage normal

function erreur(err: unknown) {
  const message = err instanceof Error ? err.message : "Erreur serveur inconnue.";
  return NextResponse.json({ error: message }, { status: 500 });
}

// GET : progression du compte connecté (et son rôle).
// GET ?all=1 : progression de tous les comptes (admin seulement).
export async function GET(request: Request) {
  try {
    const acces = await verifierAccesMath(request);
    if (!acces.ok) {
      return NextResponse.json({ error: acces.error }, { status: acces.status });
    }

    const tous = new URL(request.url).searchParams.get("all") === "1";

    if (tous) {
      if (acces.role !== "admin") {
        return NextResponse.json({ error: "Réservé à l'administration." }, { status: 403 });
      }
      const { data, error } = await supabaseAdmin()
        .from("math_progress")
        .select("user_id, data, updated_at");
      if (error) throw error;

      const ids = (data ?? []).map((l) => l.user_id);
      const { data: profils } = ids.length
        ? await supabaseAdmin().from("profiles").select("id, email, nom_complet").in("id", ids)
        : { data: [] as { id: string; email: string | null; nom_complet: string | null }[] };
      const parId = new Map((profils ?? []).map((p) => [p.id, p]));

      return NextResponse.json({
        comptes: (data ?? []).map((l) => {
          const p = parId.get(l.user_id);
          return {
            userId: l.user_id,
            email: p?.email ?? null,
            nom: p?.nom_complet ?? null,
            updatedAt: l.updated_at,
            data: l.data,
          };
        }),
      });
    }

    const { data, error } = await supabaseAdmin()
      .from("math_progress")
      .select("data, updated_at")
      .eq("user_id", acces.userId)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json(
      { role: acces.role, data: data?.data ?? null, updatedAt: data?.updated_at ?? null },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (err) {
    return erreur(err);
  }
}

// PUT : enregistre la progression du compte connecté (corps : { data }).
export async function PUT(request: Request) {
  try {
    const acces = await verifierAccesMath(request);
    if (!acces.ok) {
      return NextResponse.json({ error: acces.error }, { status: acces.status });
    }

    const texte = await request.text();
    if (texte.length > TAILLE_MAX) {
      return NextResponse.json({ error: "Données trop volumineuses." }, { status: 413 });
    }

    let corps: unknown;
    try {
      corps = JSON.parse(texte);
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const data = (corps as { data?: unknown })?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ error: "Format invalide." }, { status: 400 });
    }

    const { error } = await supabaseAdmin()
      .from("math_progress")
      .upsert(
        { user_id: acces.userId, data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return erreur(err);
  }
}

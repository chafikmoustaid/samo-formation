import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MATH_HTML } from "@/lib/mathPage";

export const dynamic = "force-dynamic";

// Adresses autorisées en plus des admins, séparées par des virgules, dans la
// variable d'environnement MATH_EMAILS_AUTORISES (ex. "a@exemple.com,b@exemple.com").
function emailsAutorises(): string[] {
  return (process.env.MATH_EMAILS_AUTORISES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const requester = supabaseFromRequest(request);

    const {
      data: { user },
      error: authError,
    } = await requester.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: profil } = await supabaseAdmin()
      .from("profiles")
      .select("role, email, desactive_le")
      .eq("id", user.id)
      .single();

    if (!profil || profil.desactive_le) {
      return NextResponse.json({ error: "Compte inactif." }, { status: 403 });
    }

    const email = (profil.email ?? user.email ?? "").toLowerCase();
    const autorise =
      profil.role === "admin" || (email !== "" && emailsAutorises().includes(email));

    if (!autorise) {
      return NextResponse.json(
        { error: "Ce compte n'a pas accès à cette page." },
        { status: 403 }
      );
    }

    return new Response(MATH_HTML, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur serveur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

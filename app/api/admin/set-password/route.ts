import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePassword } from "@/lib/generatePassword";

export async function POST(request: Request) {
  try {
    const requester = supabaseFromRequest(request);

    const {
      data: { user },
      error: authError,
    } = await requester.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: "Identifiant manquant." },
        { status: 400 }
      );
    }

    const password = generatePassword();

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    const { data: cible } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    await requester.rpc("log_audit", {
      p_action: "mot_de_passe_regenere",
      p_target_id: userId,
      p_target_email: cible?.email ?? null,
      p_details: {},
    });

    return NextResponse.json({ success: true, password });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

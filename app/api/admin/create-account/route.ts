import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePassword } from "@/lib/generatePassword";

type Role = "admin" | "instructor" | "student";

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
    const { email, role, nomComplet } = body as {
      email?: string;
      role?: Role;
      nomComplet?: string;
    };

    const emailNettoye = email?.trim().toLowerCase();

    if (!emailNettoye) {
      return NextResponse.json({ error: "Email requis." }, { status: 400 });
    }

    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNettoye);
    if (!emailValide) {
      return NextResponse.json(
        { error: "Adresse courriel invalide." },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "instructor" && role !== "student") {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    const { data: profilExistant } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", emailNettoye)
      .maybeSingle();

    if (profilExistant) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse courriel." },
        { status: 409 }
      );
    }

    const password = generatePassword();

    // email_confirm: true — le compte est immédiatement utilisable, sans
    // dépendre de l'envoi (limité) d'un email de confirmation.
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: emailNettoye,
        password,
        email_confirm: true,
      });

    if (createError || !created.user) {
      const dejaEnregistre = createError?.message
        ?.toLowerCase()
        .includes("already been registered");

      return NextResponse.json(
        {
          error: dejaEnregistre
            ? "Un compte existe déjà avec cette adresse courriel."
            : createError?.message ?? "Erreur inconnue lors de la création.",
        },
        { status: dejaEnregistre ? 409 : 500 }
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      email: emailNettoye,
      role,
      nom_complet: nomComplet?.trim() || null,
      must_change_password: true,
    });

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "Compte créé mais profil non enregistré : " +
            profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, password });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const { email, role } = body as {
      email?: string;
      role?: Role;
    };

    if (!email) {
      return NextResponse.json({ error: "Email requis." }, { status: 400 });
    }

    if (role !== "admin" && role !== "instructor" && role !== "student") {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    const password = generatePassword();

    // email_confirm: true — le compte est immédiatement utilisable, sans
    // dépendre de l'envoi (limité) d'un email de confirmation.
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Erreur inconnue lors de la création." },
        { status: 500 }
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      email,
      role,
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

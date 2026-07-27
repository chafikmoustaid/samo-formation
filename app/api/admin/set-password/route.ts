import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
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
  const { userId, password } = body as { userId?: string; password?: string };

  if (!userId || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Identifiant ou mot de passe invalide (6 caractères minimum)." },
      { status: 400 }
    );
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { supabaseFromRequest } from "@/lib/supabaseFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AccesMath =
  | { ok: true; userId: string; email: string; role: string }
  | { ok: false; status: 401 | 403; error: string };

// Adresses autorisées en plus des admins (variable MATH_EMAILS_AUTORISES).
function emailsAutorises(): string[] {
  return (process.env.MATH_EMAILS_AUTORISES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Vérifie le jeton, le compte actif et le droit d'accès à l'Atelier Maths. */
export async function verifierAccesMath(request: Request): Promise<AccesMath> {
  const {
    data: { user },
    error,
  } = await supabaseFromRequest(request).auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: "Non authentifié." };
  }

  const { data: profil } = await supabaseAdmin()
    .from("profiles")
    .select("role, email, desactive_le")
    .eq("id", user.id)
    .single();

  if (!profil || profil.desactive_le) {
    return { ok: false, status: 403, error: "Compte inactif." };
  }

  const email = (profil.email ?? user.email ?? "").toLowerCase();
  const autorise =
    profil.role === "admin" ||
    (email !== "" && emailsAutorises().includes(email));

  if (!autorise) {
    return { ok: false, status: 403, error: "Accès refusé." };
  }

  return { ok: true, userId: user.id, email, role: profil.role };
}

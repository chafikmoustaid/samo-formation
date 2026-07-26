import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Construit un client Supabase côté serveur qui porte l'identité de la
 * personne connectée (via le header Authorization envoyé par le client),
 * plutôt que d'agir de façon anonyme. Nécessaire pour que les routes API
 * respectent les policies RLS comme si l'appel venait du navigateur.
 */
export function supabaseFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  return createClient(supabaseUrl, supabaseKey, {
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

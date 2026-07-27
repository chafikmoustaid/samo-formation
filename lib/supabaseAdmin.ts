import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Client Supabase privilégié (clé service_role), à n'utiliser que côté
 * serveur (routes API), jamais côté navigateur. Permet des opérations
 * d'administration comme changer le mot de passe d'un compte sans passer
 * par un email de réinitialisation.
 */
export function supabaseAdmin() {
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur le serveur."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

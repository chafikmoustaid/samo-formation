"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type Role = "admin" | "instructor" | "student";

type GuardStatus = "loading" | "ok";

// Devine le portail (pour le ?role= de /login) depuis le chemin courant,
// pour que la redirection après déconnexion/expiration affiche le bon
// écran (formateur, étudiant ou admin) plutôt que de retomber par défaut
// sur "Connexion étudiant" quel que soit le rôle réel de la personne.
function roleDepuisChemin(pathname: string): Role | null {
  if (pathname.startsWith("/instructor")) return "instructor";
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/dashboard")) return "admin";
  return null;
}

function urlLogin(role: Role | null, params?: Record<string, string>) {
  const query = new URLSearchParams(params);
  if (role) query.set("role", role);
  const qs = query.toString();
  return qs ? `/login?${qs}` : "/login";
}

type Profile = {
  id: string;
  email: string;
  role: Role;
};

// Déconnexion automatique après une période d'inactivité, pour limiter le
// risque si une session reste ouverte sur un poste partagé ou oublié.
const DELAI_INACTIVITE_MS = 30 * 60 * 1000;
const EVENEMENTS_ACTIVITE = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Vérifie côté client que l'utilisateur est connecté ET a l'un des rôles
 * autorisés. Redirige vers /login sinon. Utilisé dans les layout.tsx de
 * /student, /instructor et /dashboard pour empêcher l'accès direct par lien
 * sans être connecté avec le bon rôle.
 *
 * Note : ceci est une protection côté application (évite d'afficher le
 * contenu), pas une protection réseau — la sécurité de fond des données
 * reste assurée par les policies RLS de Supabase.
 */
export function useAuthGuard(allowedRoles: Role[]) {
  const router = useRouter();
  const [status, setStatus] = useState<GuardStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const rolesKey = allowedRoles.join(",");

  useEffect(() => {
    let active = true;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(urlLogin(roleDepuisChemin(window.location.pathname)));
        return;
      }

      const { data: profil } = await supabase
        .from("profiles")
        .select("role, email, must_change_password")
        .eq("id", user.id)
        .single();

      if (!active) return;

      const role = profil?.role as Role | undefined;

      if (!role || !rolesKey.split(",").includes(role)) {
        router.replace(urlLogin(role ?? roleDepuisChemin(window.location.pathname)));
        return;
      }

      if (profil?.must_change_password) {
        router.replace("/change-password");
        return;
      }

      // Si le compte a activé la vérification en deux étapes mais que la
      // session courante n'est qu'au niveau aal1 (ex. accès direct par
      // lien après une connexion incomplète), on renvoie vers le défi MFA
      // plutôt que de laisser passer.
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        router.replace(
          `/mfa-challenge?next=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      setProfile({
        id: user.id,
        email: profil?.email ?? user.email ?? "",
        role,
      });
      setStatus("ok");
    }

    check();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesKey, router]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "ok") return;

    function deconnecterPourInactivite() {
      supabase.auth.signOut().finally(() => {
        router.replace(
          urlLogin(profile?.role ?? roleDepuisChemin(window.location.pathname), {
            session: "expiree",
          })
        );
      });
    }

    function reinitialiserTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(deconnecterPourInactivite, DELAI_INACTIVITE_MS);
    }

    reinitialiserTimer();
    EVENEMENTS_ACTIVITE.forEach((evt) =>
      window.addEventListener(evt, reinitialiserTimer)
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENEMENTS_ACTIVITE.forEach((evt) =>
        window.removeEventListener(evt, reinitialiserTimer)
      );
    };
  }, [status, router]);

  return { status, profile };
}

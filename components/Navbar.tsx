"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "instructor" | "student";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Identifiant du compte connu de cet onglet. Le jeton de session Supabase
  // est stocké dans le localStorage du navigateur, commun à tous les onglets
  // du même site — si un autre compte se connecte dans un autre onglet (ex.
  // test d'un compte admin en parallèle d'un compte formateur), la session
  // de CET onglet peut être remplacée silencieusement par celle de l'autre
  // compte. Sans ce garde-fou, l'interface bascule alors discrètement vers
  // le nouveau rôle (voir incident du 17/08/2026 : un formateur s'est
  // retrouvé avec les droits admin après validation d'une fiche, simplement
  // parce qu'une session admin était ouverte dans un autre onglet). On
  // détecte donc tout changement de compte en cours de route et on force
  // une reconnexion explicite plutôt que de continuer silencieusement.
  const compteConnuRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setRole(null);
          setEmail(null);
        }
        compteConnuRef.current = null;
        return;
      }

      if (
        compteConnuRef.current !== undefined &&
        compteConnuRef.current !== null &&
        compteConnuRef.current !== user.id
      ) {
        await supabase.auth.signOut();
        window.location.href = "/login?session=changee";
        return;
      }

      compteConnuRef.current = user.id;

      const { data: profil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!active) return;

      setRole((profil?.role as Role) ?? null);
      setEmail(user.email ?? null);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  // Page d'accueil, connexion et réinitialisation : pas de barre de navigation interne.
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/change-password" ||
    pathname === "/confidentialite" ||
    pathname === "/conditions-utilisation" ||
    pathname === "/mfa-challenge"
  ) {
    return null;
  }

  async function logout() {
    const roleAvantDeconnexion = role;
    await supabase.auth.signOut();
    router.replace(
      roleAvantDeconnexion ? `/login?role=${roleAvantDeconnexion}` : "/login"
    );
  }

  // Espace dans lequel on se trouve actuellement. Étudiants et formateurs
  // passent aussi par /attendance (fiche de présence) : pour eux, ce n'est
  // pas un changement d'espace, ils gardent leur lien d'accueil habituel.
  // Seul l'admin circule réellement entre les trois espaces, donc c'est
  // seulement pour lui que la nav doit s'adapter à la page courante.
  const section: "student" | "instructor" | "admin" = pathname.startsWith(
    "/student"
  )
    ? "student"
    : pathname.startsWith("/instructor")
    ? "instructor"
    : "admin";

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-nowrap overflow-x-auto">
        <div className="flex items-center gap-5 flex-nowrap shrink-0">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={260}
              height={78}
              className="h-11 w-auto"
            />
          </Link>

          {role === "admin" && section === "admin" && (
            <>
              {pathname !== "/dashboard" && (
                <Link
                  href="/dashboard"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Dashboard
                </Link>
              )}
              {pathname !== "/attendance/history" && (
                <Link
                  href="/attendance/history"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Fiches de présence
                </Link>
              )}
              {pathname !== "/development/history" && (
                <Link
                  href="/development/history"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Fiches de développement
                </Link>
              )}
              {pathname !== "/dashboard/feuilles-route" && (
                <Link
                  href="/dashboard/feuilles-route"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Feuilles de route
                </Link>
              )}
              {!pathname.startsWith("/dashboard/comptes") && (
                <Link
                  href="/dashboard/comptes"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Gestion des comptes
                </Link>
              )}
            </>
          )}

          {(role === "instructor" ||
            (role === "admin" && section === "instructor")) && (
            <>
              {pathname !== "/instructor" && (
                <Link
                  href="/instructor"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Portail formateur
                </Link>
              )}
              {pathname !== "/instructor/attendance" && (
                <Link
                  href="/instructor/attendance"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Fiches de présence
                </Link>
              )}
              {pathname !== "/development/history" && (
                <Link
                  href="/development/history"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Fiches de développement
                </Link>
              )}
              {pathname !== "/instructor/feuilles-route" && (
                <Link
                  href="/instructor/feuilles-route"
                  className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  Feuilles de route
                </Link>
              )}
            </>
          )}

          {role === "student" && pathname !== "/student" && (
            <Link
              href="/student"
              className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
            >
              Mon espace
            </Link>
          )}

          {role === "admin" && section === "student" && pathname !== "/student" && (
            <Link
              href="/student"
              className="text-sm font-bold hover:text-white/80 transition-colors whitespace-nowrap"
            >
              Portail étudiant
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm shrink-0">
          {email && (
            <>
              <span className="opacity-90 hidden sm:inline font-medium whitespace-nowrap">{email}</span>
              <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap"
              >
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

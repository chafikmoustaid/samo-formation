"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "instructor" | "student";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);

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
        return;
      }

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
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={260}
              height={78}
              className="h-16 w-auto"
            />
          </Link>

          {role === "admin" && section === "admin" && (
            <>
              {pathname !== "/dashboard" && (
                <Link
                  href="/dashboard"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {pathname !== "/attendance/history" && (
                <Link
                  href="/attendance/history"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Fiches de présence
                </Link>
              )}
              {pathname !== "/development/history" && (
                <Link
                  href="/development/history"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Fiches de développement
                </Link>
              )}
              {pathname !== "/dashboard/feuilles-route" && (
                <Link
                  href="/dashboard/feuilles-route"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Dossier de formation
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
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Portail formateur
                </Link>
              )}
              {pathname !== "/instructor/attendance" && (
                <Link
                  href="/instructor/attendance"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Fiches de présence
                </Link>
              )}
              {pathname !== "/development" && (
                <Link
                  href="/development"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Fiche de développement
                </Link>
              )}
              {pathname !== "/instructor/feuilles-route" && (
                <Link
                  href="/instructor/feuilles-route"
                  className="text-base font-bold hover:text-white/80 transition-colors"
                >
                  Dossier de formation
                </Link>
              )}
            </>
          )}

          {role === "student" && pathname !== "/student" && (
            <Link
              href="/student"
              className="text-base font-bold hover:text-white/80 transition-colors"
            >
              Mon espace
            </Link>
          )}

          {role === "admin" && section === "student" && pathname !== "/student" && (
            <Link
              href="/student"
              className="text-base font-bold hover:text-white/80 transition-colors"
            >
              Portail étudiant
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4 text-base">
          {email && (
            <>
              <span className="opacity-90 hidden sm:inline font-medium">{email}</span>
              <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition-colors"
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

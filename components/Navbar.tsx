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
    pathname === "/mfa-challenge"
  ) {
    return null;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
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

  // Le sélecteur d'espace n'apparaît que depuis la section Administration,
  // pour ne pas dupliquer le lien de la section où l'admin se trouve déjà
  // (ex: "Portail formateur" à gauche + pastille "Formateur" à droite).
  const peutChangerEspace = role === "admin" && section === "admin";

  return (
    <nav className="bg-green-700 text-white shadow">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 flex-wrap">
          <Link
            href="/"
            className="flex items-center shrink-0 bg-white rounded-lg px-3 py-1.5 shadow-sm"
          >
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={160}
              height={49}
              className="h-9 w-auto"
            />
          </Link>

          {role === "admin" && section === "admin" && (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-white/80 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/attendance"
                className="text-sm font-medium hover:text-white/80 transition-colors"
              >
                Nouvelle fiche
              </Link>
              <Link
                href="/attendance/history"
                className="text-sm font-medium hover:text-white/80 transition-colors"
              >
                Historique
              </Link>
            </>
          )}

          {(role === "instructor" ||
            (role === "admin" && section === "instructor")) && (
            <>
              <Link
                href="/instructor"
                className="text-sm font-medium hover:text-white/80 transition-colors"
              >
                Portail formateur
              </Link>
              <Link
                href="/instructor/attendance"
                className="text-sm font-medium hover:text-white/80 transition-colors"
              >
                Fiches de présence
              </Link>
            </>
          )}

          {role === "student" && (
            <Link
              href="/student"
              className="text-sm font-medium hover:text-white/80 transition-colors"
            >
              Mon espace
            </Link>
          )}

          {role === "admin" && section === "student" && (
            <Link
              href="/student"
              className="text-sm font-medium hover:text-white/80 transition-colors"
            >
              Portail étudiant
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {peutChangerEspace && (
            <div className="flex items-center gap-3 text-xs opacity-80">
              <span>Aller vers :</span>
              <Link href="/instructor" className="hover:underline">
                Formateur
              </Link>
              <Link href="/student" className="hover:underline">
                Étudiant
              </Link>
            </div>
          )}

          {email && (
            <>
              <span className="opacity-90 hidden sm:inline">{email}</span>
              <button
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
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

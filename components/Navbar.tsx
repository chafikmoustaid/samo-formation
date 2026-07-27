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
    pathname === "/reset-password"
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

  const peutChangerEspace = role === "admin";

  return (
    <nav className="bg-green-700 text-white shadow">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5 flex-wrap">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={120}
              height={37}
              className="h-7 w-auto brightness-0 invert"
            />
          </Link>

          {role === "admin" && section === "admin" && (
            <>
              <Link href="/dashboard" className="hover:underline text-sm">
                📊 Dashboard
              </Link>
              <Link href="/attendance" className="hover:underline text-sm">
                📄 Nouvelle fiche
              </Link>
              <Link
                href="/attendance/history"
                className="hover:underline text-sm"
              >
                🕒 Historique
              </Link>
            </>
          )}

          {role === "instructor" && (
            <Link href="/instructor" className="hover:underline text-sm">
              🎓 Portail formateur
            </Link>
          )}

          {role === "admin" && section === "instructor" && (
            <Link href="/instructor" className="hover:underline text-sm">
              🎓 Portail formateur
            </Link>
          )}

          {role === "student" && (
            <Link href="/student" className="hover:underline text-sm">
              📚 Mon espace
            </Link>
          )}

          {role === "admin" && section === "student" && (
            <Link href="/student" className="hover:underline text-sm">
              📚 Portail étudiant
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {peutChangerEspace && (
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <Link
                href="/dashboard"
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  section === "admin"
                    ? "bg-white/25"
                    : "hover:bg-white/15 opacity-90"
                }`}
              >
                Administration
              </Link>
              <Link
                href="/instructor"
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  section === "instructor"
                    ? "bg-white/25"
                    : "hover:bg-white/15 opacity-90"
                }`}
              >
                Formateur
              </Link>
              <Link
                href="/student"
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  section === "student"
                    ? "bg-white/25"
                    : "hover:bg-white/15 opacity-90"
                }`}
              >
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

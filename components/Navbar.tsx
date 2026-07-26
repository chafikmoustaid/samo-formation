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

          {role === "admin" && (
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
              <Link href="/instructor" className="hover:underline text-sm">
                🎓 Portail formateur
              </Link>
              <Link href="/student" className="hover:underline text-sm">
                📚 Portail étudiant
              </Link>
            </>
          )}

          {role === "instructor" && (
            <Link href="/instructor" className="hover:underline text-sm">
              🎓 Portail formateur
            </Link>
          )}

          {role === "student" && (
            <Link href="/student" className="hover:underline text-sm">
              📚 Mon espace
            </Link>
          )}
        </div>

        {email && (
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-90 hidden sm:inline">{email}</span>
            <button
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

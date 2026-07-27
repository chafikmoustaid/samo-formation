"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "instructor" | "student";

const PORTAIL_PAR_ROLE: Record<Role, string> = {
  admin: "/dashboard",
  instructor: "/instructor",
  student: "/student",
};

export default function ChangePasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error: updateErr } = await supabase.auth.updateUser({
      password,
    });

    if (updateErr) {
      setLoading(false);
      setError(updateErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch("/api/account/clear-must-change-password", {
      method: "POST",
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    const { data: profil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id)
      .single();

    setLoading(false);

    const destination =
      PORTAIL_PAR_ROLE[(profil?.role as Role) ?? "student"] ?? "/";

    router.replace(destination);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <Link href="/" className="mb-8">
        <Image
          src="/logo-samo.png"
          alt="Formation SAMO"
          width={220}
          height={68}
          priority
          className="w-[180px] h-auto"
        />
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Choisis ton mot de passe
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          C&apos;est ta première connexion. Remplace le mot de passe
          temporaire par un mot de passe personnel avant de continuer.
        </p>

        {checking ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (
          <form onSubmit={changerMotDePasse}>
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none p-3 rounded-lg mb-4 text-sm"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirme le mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none p-3 rounded-lg mb-6 text-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "Enregistrement..." : "Continuer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

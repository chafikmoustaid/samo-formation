"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Le lien de réinitialisation établit une session "recovery" via l'URL.
    // On attend l'événement PASSWORD_RECOVERY (ou une session déjà active)
    // avant d'autoriser le changement de mot de passe.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function updatePassword(e: React.FormEvent) {
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
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setDone(true);
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
          Nouveau mot de passe
        </h1>

        {done ? (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Ton mot de passe a été mis à jour.
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Aller à la connexion
            </button>
          </>
        ) : !ready ? (
          <p className="text-sm text-gray-500 mb-2">
            Ouvre cette page à partir du lien reçu par email pour continuer.
          </p>
        ) : (
          <form onSubmit={updatePassword}>
            <p className="text-sm text-gray-500 mb-6">
              Choisis un nouveau mot de passe pour ton compte.
            </p>

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
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const CATEGORIES = {
  student: {
    titre: "Connexion étudiant",
    sousTitre: "Connecte-toi avec ton compte étudiant.",
  },
  instructor: {
    titre: "Connexion formateur",
    sousTitre: "Connecte-toi avec ton compte formateur.",
  },
  admin: {
    titre: "Connexion administration",
    sousTitre: "Connecte-toi avec ton compte administrateur.",
  },
} as const;

type Categorie = keyof typeof CATEGORIES;

function LoginForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const categorie: Categorie =
    roleParam === "student" || roleParam === "instructor" || roleParam === "admin"
      ? roleParam
      : "student";

  const { titre, sousTitre } = CATEGORIES[categorie];
  const sessionExpiree = searchParams.get("session") === "expiree";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function envoyerReinitialisation(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setResetLoading(false);

    if (resetErr) {
      setResetError(resetErr.message);
      return;
    }

    setResetSent(true);
  }

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: verrou } = await supabase.rpc("verifier_verrouillage", {
      p_email: email,
    });

    const etatVerrou = verrou?.[0];

    if (etatVerrou?.verrouille) {
      const minutes = Math.ceil(etatVerrou.secondes_restantes / 60);
      setError(
        `Trop de tentatives échouées. Réessaie dans environ ${minutes} minute${
          minutes > 1 ? "s" : ""
        }.`
      );
      setLoading(false);
      return;
    }

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      await supabase.rpc("enregistrer_echec_connexion", { p_email: email });
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    await supabase.rpc("reinitialiser_echecs_connexion", { p_email: email });

    const userId = data.user.id;

    const { data: profil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profil) {
      setError(
        "Aucun profil associé à ce compte. Contacte l'administration."
      );
      setLoading(false);
      return;
    }

    // La redirection suit toujours le vrai rôle enregistré en base,
    // jamais la catégorie choisie sur la page d'accueil (qui n'affecte
    // que le texte affiché ici).
    const destination =
      profil.role === "admin"
        ? "/dashboard"
        : profil.role === "instructor"
        ? "/instructor"
        : profil.role === "student"
        ? "/student"
        : null;

    if (!destination) {
      setError("Rôle de compte inconnu. Contacte l'administration.");
      setLoading(false);
      return;
    }

    // Si le compte a activé la vérification en deux étapes, la connexion
    // par mot de passe seul n'est qu'au niveau aal1 : on redirige vers le
    // défi MFA avant d'accéder à l'espace protégé.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      window.location.href = `/mfa-challenge?next=${encodeURIComponent(destination)}`;
      return;
    }

    window.location.href = destination;
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

      {mode === "login" ? (
        <form
          onSubmit={connexion}
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm"
        >
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            {titre}
          </h1>
          <p className="text-sm text-gray-500 mb-6">{sousTitre}</p>

          {sessionExpiree && !error && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Ta session a expiré après une période d&apos;inactivité. Reconnecte-toi.
            </div>
          )}

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            placeholder="toi@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none p-3 rounded-lg mb-4 text-sm"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none p-3 rounded-lg mb-2 text-sm"
          />

          <div className="text-right mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setResetSent(false);
                setResetError(null);
              }}
              className="text-xs text-gray-600 hover:text-green-700 underline"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={envoyerReinitialisation}
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm"
        >
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Mot de passe oublié
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Indique ton email, on t&apos;envoie un lien pour choisir un
            nouveau mot de passe.
          </p>

          {resetError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {resetError}
            </div>
          )}

          {resetSent ? (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Si un compte existe pour {email}, un email vient d&apos;être
              envoyé avec un lien de réinitialisation.
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none p-3 rounded-lg mb-6 text-sm"
              />

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
              >
                {resetLoading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMode("login")}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900 underline mt-4"
          >
            ← Retour à la connexion
          </button>
        </form>
      )}

      <Link
        href="/"
        className="mt-6 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

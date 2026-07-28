"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function MfaChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    // Si la session est déjà au niveau requis (aal2) ou si l'utilisateur
    // n'a pas de facteur MFA, pas besoin de rester sur cette page.
    async function verifier() {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!data) return;

      if (data.nextLevel !== "aal2" || data.currentLevel === "aal2") {
        router.replace(next);
        return;
      }

      setPret(true);
    }

    verifier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifierCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: facteurs, error: erreurFacteurs } =
      await supabase.auth.mfa.listFactors();

    if (erreurFacteurs || !facteurs) {
      setError("Impossible de récupérer les facteurs d'authentification.");
      setLoading(false);
      return;
    }

    const facteurTotp = facteurs.totp[0];

    if (!facteurTotp) {
      setError("Aucun facteur d'authentification à deux étapes trouvé.");
      setLoading(false);
      return;
    }

    const { data: challenge, error: erreurChallenge } =
      await supabase.auth.mfa.challenge({ factorId: facteurTotp.id });

    if (erreurChallenge || !challenge) {
      setError(erreurChallenge?.message ?? "Erreur lors de la vérification.");
      setLoading(false);
      return;
    }

    const { error: erreurVerif } = await supabase.auth.mfa.verify({
      factorId: facteurTotp.id,
      challengeId: challenge.id,
      code: code.trim(),
    });

    setLoading(false);

    if (erreurVerif) {
      setError("Code invalide. Réessaie.");
      return;
    }

    router.replace(next);
  }

  if (!pret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-green-600 animate-spin" />
          Vérification...
        </div>
      </div>
    );
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

      <form
        onSubmit={verifierCode}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Vérification en deux étapes
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Entre le code à 6 chiffres généré par ton application
          d&apos;authentification.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          className="w-full border border-gray-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none p-3 rounded-lg mb-6 text-sm text-center tracking-widest text-lg"
        />

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? "Vérification..." : "Vérifier"}
        </button>
      </form>
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallengeForm />
    </Suspense>
  );
}

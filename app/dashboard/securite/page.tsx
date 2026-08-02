"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type Facteur = {
  id: string;
  friendly_name?: string | null;
  status: string;
};

export default function SecuritePage() {
  const [facteurs, setFacteurs] = useState<Facteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  const [enrolement, setEnrolement] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chargerFacteurs();
  }, []);

  async function chargerFacteurs() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFacteurs((data?.totp as Facteur[]) ?? []);
    setLoading(false);
  }

  async function demarrerEnrolement() {
    setMessage(null);
    setBusy(true);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Formation SAMO — ${new Date().toLocaleDateString("fr-CA")}`,
    });

    setBusy(false);

    if (error || !data) {
      setMessage({ type: "erreur", texte: error?.message ?? "Erreur lors de l'enrôlement." });
      return;
    }

    setEnrolement({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmerEnrolement(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolement) return;

    setMessage(null);
    setBusy(true);

    const { data: challenge, error: erreurChallenge } = await supabase.auth.mfa.challenge({
      factorId: enrolement.factorId,
    });

    if (erreurChallenge || !challenge) {
      setBusy(false);
      setMessage({ type: "erreur", texte: erreurChallenge?.message ?? "Erreur de vérification." });
      return;
    }

    const { error: erreurVerif } = await supabase.auth.mfa.verify({
      factorId: enrolement.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    setBusy(false);

    if (erreurVerif) {
      setMessage({ type: "erreur", texte: "Code invalide. Réessaie." });
      return;
    }

    setMessage({ type: "succes", texte: "Authentification à deux facteurs activée." });
    setEnrolement(null);
    setCode("");
    chargerFacteurs();
  }

  async function annulerEnrolement() {
    if (enrolement) {
      await supabase.auth.mfa.unenroll({ factorId: enrolement.factorId });
    }
    setEnrolement(null);
    setCode("");
  }

  async function retirerFacteur(factorId: string) {
    const confirmation = window.confirm(
      "Désactiver l'authentification à deux facteurs pour ce compte ?"
    );
    if (!confirmation) return;

    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    setBusy(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({ type: "succes", texte: "Authentification à deux facteurs désactivée." });
    chargerFacteurs();
  }

  const facteurVerifie = facteurs.find((f) => f.status === "verified");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Sécurité du compte"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        {message && (
          <div
            className={`mb-6 text-sm rounded-lg px-4 py-3 border ${
              message.type === "erreur"
                ? "bg-red-50 border-red-100 text-red-700"
                : "bg-green-50 border-green-100 text-green-700"
            }`}
          >
            {message.texte}
          </div>
        )}

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Authentification à deux facteurs
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Ajoute une étape de vérification à la connexion, en plus de ton
            mot de passe. Recommandé pour les comptes administrateurs, qui
            ont accès à tous les comptes et données de la plateforme.
          </p>

          {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : facteurVerifie ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <Badge tone="success">Activée</Badge>
                <p className="text-sm text-gray-600 mt-2">
                  {facteurVerifie.friendly_name || "Application d'authentification"}
                </p>
              </div>
              <button
                onClick={() => retirerFacteur(facteurVerifie.id)}
                disabled={busy}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Désactiver
              </button>
            </div>
          ) : enrolement ? (
            <form onSubmit={confirmerEnrolement} className="space-y-4">
              <p className="text-sm text-gray-700">
                Scanne ce code avec une application d&apos;authentification,
                puis entre le code généré.
              </p>

              <div className="border border-gray-200 rounded-lg p-4 w-fit bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrolement.qrCode} alt="Code QR à scanner" width={200} height={200} />
              </div>

              <p className="text-xs text-gray-400">
                Impossible de scanner ? Clé manuelle :{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                  {enrolement.secret}
                </code>
              </p>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Code à 6 chiffres"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm tracking-widest"
              />

              <div className="flex gap-3">
                <Button type="submit" disabled={busy || code.length !== 6}>
                  {busy ? "Vérification…" : "Activer"}
                </Button>
                <Button type="button" variant="outline" onClick={annulerEnrolement}>
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={demarrerEnrolement} disabled={busy}>
              {busy ? "Préparation…" : "Activer la vérification en deux étapes"}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

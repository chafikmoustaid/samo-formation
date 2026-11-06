"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

const CHAPITRES = [
  "Manipulation d'expressions algébriques",
  "Factorisation",
  "Étude des fonctions",
  "Fonction du second degré",
  "Triangles et figures équivalentes",
  "Relations trigonométriques",
  "Droites et inéquations à deux variables",
  "Systèmes d'équations",
  "Statistique",
];

type Donnees = {
  quiz?: Record<string, number>;
  quiz2?: Record<string, number>;
  prob?: Record<string, number>;
  miss?: Record<string, { ch?: number; n?: number }>;
  hist?: { titre: string; pct: number; date: string }[];
  plan?: { date?: string; done?: Record<string, unknown> };
};

type Compte = {
  userId: string;
  email: string | null;
  nom: string | null;
  updatedAt: string;
  data: Donnees;
};

function Suivi() {
  const [comptes, setComptes] = useState<Compte[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setErreur("Session expirée. Reconnecte-toi.");
      try {
        const r = await fetch("/api/math/progress?all=1", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!actif) return;
        if (!r.ok) return setErreur("Impossible de charger le suivi.");
        setComptes(((await r.json()) as { comptes: Compte[] }).comptes);
      } catch {
        if (actif) setErreur("Impossible de charger le suivi.");
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Suivi de l&apos;Atelier Maths SN4
        </h1>
        <Link href="/math" className="text-sm text-indigo-700 underline">
          Retour à l&apos;atelier
        </Link>
      </div>

      {erreur && <p className="text-red-700">{erreur}</p>}
      {!erreur && comptes === null && <p className="text-gray-500">Chargement...</p>}
      {comptes && comptes.length === 0 && (
        <p className="text-gray-600">
          Aucune progression enregistrée pour l&apos;instant. Elle apparaît ici
          dès qu&apos;un compte fait un quiz dans l&apos;atelier.
        </p>
      )}

      {comptes?.map((c) => {
        const d = c.data ?? {};
        const nbErreurs = Object.keys(d.miss ?? {}).length;
        const nbProb = Object.keys(d.prob ?? {}).length;
        const faibles = CHAPITRES.map((titre, i) => {
          const id = String(i + 1);
          const q = d.quiz?.[id];
          const q2 = d.quiz2?.[id];
          const vals = [q, q2].filter((v): v is number => typeof v === "number");
          const moy = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          const err = Object.values(d.miss ?? {}).filter((m) => String(m.ch) === id).length;
          return { id, titre, q, q2, moy, err };
        });
        const aTravailler = faibles
          .filter((f) => f.moy !== null && f.moy < 70)
          .sort((a, b) => (a.moy ?? 0) - (b.moy ?? 0))
          .slice(0, 3);
        const nonTentes = faibles.filter((f) => f.moy === null).length;

        return (
          <section key={c.userId} className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {c.nom ?? c.email ?? "Compte"}
              </h2>
              <p className="text-sm text-gray-500">
                Dernière activité :{" "}
                {new Date(c.updatedAt).toLocaleDateString("fr-CA", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {c.nom && c.email && <p className="text-sm text-gray-500">{c.email}</p>}

            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-900">
                {nbErreurs} question{nbErreurs > 1 ? "s" : ""} à revoir
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-900">
                {nbProb}/22 problèmes faits
              </span>
              {d.plan?.date && (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-900">
                  Épreuve prévue : {d.plan.date}
                </span>
              )}
            </div>

            <p className="mt-4 text-sm text-gray-800">
              {aTravailler.length > 0 ? (
                <>
                  <b>À travailler en priorité :</b>{" "}
                  {aTravailler
                    .map((f) => `chapitre ${f.id} (${Math.round(f.moy ?? 0)} %)`)
                    .join(", ")}
                  .
                </>
              ) : nonTentes === 9 ? (
                <>Aucun quiz tenté pour l&apos;instant.</>
              ) : (
                <>Tous les chapitres tentés sont au-dessus de 70 %.</>
              )}
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 pr-3 font-medium">Chapitre</th>
                    <th className="py-2 pr-3 font-medium">Quiz</th>
                    <th className="py-2 pr-3 font-medium">Quiz pièges</th>
                    <th className="py-2 font-medium">À revoir</th>
                  </tr>
                </thead>
                <tbody>
                  {faibles.map((f) => (
                    <tr key={f.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        {f.id}. {f.titre}
                      </td>
                      <td className={`py-2 pr-3 ${f.q !== undefined && f.q < 70 ? "font-semibold text-red-700" : ""}`}>
                        {f.q !== undefined ? `${f.q} %` : "—"}
                      </td>
                      <td className={`py-2 pr-3 ${f.q2 !== undefined && f.q2 < 70 ? "font-semibold text-red-700" : ""}`}>
                        {f.q2 !== undefined ? `${f.q2} %` : "—"}
                      </td>
                      <td className="py-2">{f.err || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {d.hist && d.hist.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Derniers résultats</p>
                <ul className="mt-1 text-sm text-gray-600">
                  {d.hist.slice(0, 5).map((h, i) => (
                    <li key={i}>
                      {h.titre} : <b>{h.pct} %</b> ({h.date})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function SuiviPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <Suivi />
    </AuthGuard>
  );
}

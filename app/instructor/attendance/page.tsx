"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ONGLETS = [
  { valeur: "en_attente", label: "En attente" },
  { valeur: "validee", label: "Validées" },
  { valeur: "refusee", label: "Refusées" },
] as const;

const STATUT_STYLE: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-800",
  validee: "bg-green-100 text-green-800",
  refusee: "bg-red-100 text-red-800",
};

export default function InstructorAttendancePage() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] =
    useState<(typeof ONGLETS)[number]["valeur"]>("en_attente");

  useEffect(() => {
    chargerFiches();
  }, []);

  async function chargerFiches() {
    setLoading(true);

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("semaine_debut", { ascending: false });

    setFiches(data ?? []);
    setLoading(false);
  }

  const fichesFiltrees = fiches.filter((f) => f.statut === onglet);
  const nbEnAttente = fiches.filter((f) => f.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-4xl font-bold text-green-700">
            Fiches de présence
          </h1>

          <Link href="/instructor" className="text-sm text-gray-500 hover:underline">
            ← Portail formateur
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          {ONGLETS.map((o) => (
            <button
              key={o.valeur}
              onClick={() => setOnglet(o.valeur)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                onglet === o.valeur
                  ? "bg-green-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {o.label}
              {o.valeur === "en_attente" && nbEnAttente > 0 && (
                <span className="ml-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                  {nbEnAttente}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8">Chargement...</div>
          ) : fichesFiltrees.length === 0 ? (
            <div className="p-8 text-gray-500">
              Aucune fiche dans cette catégorie.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="p-4">Étudiant</th>
                  <th className="p-4">Semaine du</th>
                  <th className="p-4">Au</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4"></th>
                </tr>
              </thead>

              <tbody>
                {fichesFiltrees.map((fiche) => (
                  <tr key={fiche.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{fiche.nom_etudiant}</td>
                    <td className="p-4">{String(fiche.semaine_debut)}</td>
                    <td className="p-4">{String(fiche.semaine_fin)}</td>
                    <td className="p-4">{fiche.total_heures} h</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUT_STYLE[fiche.statut] ?? ""
                        }`}
                      >
                        {fiche.statut}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/attendance/${fiche.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {fiche.statut === "en_attente" ? "Examiner" : "Voir"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

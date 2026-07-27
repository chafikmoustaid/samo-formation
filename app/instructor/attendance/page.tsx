"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const ONGLETS = [
  { valeur: "en_attente", label: "En attente" },
  { valeur: "validee", label: "Validées" },
  { valeur: "refusee", label: "Refusées" },
] as const;

const STATUT_TONE = {
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
} as const;

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
      .order("id", { ascending: false });

    setFiches(data ?? []);
    setLoading(false);
  }

  const fichesFiltrees = fiches.filter((f) => f.statut === onglet);
  const nbEnAttente = fiches.filter((f) => f.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Fiches de présence"
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <div className="flex gap-2 mb-6">
          {ONGLETS.map((o) => (
            <button
              key={o.valeur}
              onClick={() => setOnglet(o.valeur)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                onglet === o.valeur
                  ? "bg-green-700 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
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

        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-gray-400">Chargement...</div>
          ) : fichesFiltrees.length === 0 ? (
            <div className="p-8 text-gray-500 text-sm">
              Aucune fiche dans cette catégorie.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="p-4 font-medium">Étudiant</th>
                  <th className="p-4 font-medium">Formation</th>
                  <th className="p-4 font-medium">Pratique</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4"></th>
                </tr>
              </thead>

              <tbody>
                {fichesFiltrees.map((fiche) => (
                  <tr key={fiche.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4">{fiche.nom_etudiant}</td>
                    <td className="p-4">{fiche.total_formation ?? 0} h</td>
                    <td className="p-4">{fiche.total_pratique ?? 0} h</td>
                    <td className="p-4">{fiche.total_heures} h</td>
                    <td className="p-4">
                      <Badge
                        tone={
                          STATUT_TONE[
                            fiche.statut as keyof typeof STATUT_TONE
                          ] ?? "neutral"
                        }
                      >
                        {fiche.statut}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/attendance/${fiche.id}`}
                        className="text-green-700 hover:underline text-sm"
                      >
                        {fiche.statut === "en_attente" ? "Examiner" : "Voir"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

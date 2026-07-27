"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STATUT_STYLE: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-800",
  validee: "bg-green-100 text-green-800",
  refusee: "bg-red-100 text-red-800",
};

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  validee: "Validée",
  refusee: "Refusée",
};

export default function StudentAttendancePage() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerFiches();
  }, []);

  async function chargerFiches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("semaine_debut", { ascending: false });

    setFiches(data ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-4xl font-bold text-green-700">
            Mes fiches de présence
          </h1>

          <Link
            href="/attendance"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            + Nouvelle fiche
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-gray-500">
              Tu n&apos;as encore soumis aucune fiche de présence.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500">
                  <th className="p-4">Semaine du</th>
                  <th className="p-4">Au</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4"></th>
                </tr>
              </thead>

              <tbody>
                {fiches.map((fiche) => (
                  <tr key={fiche.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{String(fiche.semaine_debut)}</td>
                    <td className="p-4">{String(fiche.semaine_fin)}</td>
                    <td className="p-4">{fiche.total_heures} h</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUT_STYLE[fiche.statut] ?? ""
                        }`}
                      >
                        {STATUT_LABEL[fiche.statut] ?? fiche.statut}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/attendance/${fiche.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Voir
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

"use client";

import { useEffect, useState } from "react";
import StatusSelector from "@/components/StatusSelector";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DeleteAttendanceButton from "@/components/DeleteAttendanceButton";

export default function AttendanceHistory() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerFiches();
  }, []);

  async function chargerFiches() {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setFiches(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-red-600 text-2xl font-bold">
          Erreur de chargement
        </h1>

        <pre className="mt-4">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Historique des fiches de présence
        </h1>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="p-4 text-left">Étudiant</th>
                <th className="p-4 text-left">Formateur</th>
                <th className="p-4 text-left">Matière</th>
                <th className="p-4 text-left">Total</th>
                <th className="p-4 text-left">Statut</th>
                <th className="p-4 text-left">Début</th>
                <th className="p-4 text-left">Fin</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {fiches.map((fiche) => (
                <tr
                  key={fiche.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4">{fiche.nom_etudiant}</td>
                  <td className="p-4">{fiche.nom_formateur}</td>
                  <td className="p-4">{fiche.matiere}</td>
                  <td className="p-4">{fiche.total_heures} h</td>
                  <td className="p-4">
                    <StatusSelector
  id={fiche.id}
  statut={fiche.statut}
/>
                  </td>
                  <td className="p-4">{String(fiche.semaine_debut)}</td>
                  <td className="p-4">{String(fiche.semaine_fin)}</td>

                  <td className="p-4 space-x-2">
                    {/* Balise <Link> corrigée ici */}
                    <Link
                      href={`/attendance/${fiche.id}`}
                      className="bg-blue-100 text-blue-700 px-3 py-2 rounded"
                    >
                      Voir
                    </Link>

                    <DeleteAttendanceButton
  id={fiche.id}
/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

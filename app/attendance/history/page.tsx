"use client";

import { useEffect, useState } from "react";
import StatusSelector from "@/components/StatusSelector";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DeleteAttendanceButton from "@/components/DeleteAttendanceButton";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-red-600 text-xl font-bold">
          Erreur de chargement
        </h1>

        <pre className="mt-4 text-sm">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Historique des fiches de présence"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Étudiant</th>
                <th className="p-4 font-medium">Formateur</th>
                <th className="p-4 font-medium">Formation</th>
                <th className="p-4 font-medium">Pratique</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Statut</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {fiches.map((fiche) => (
                <tr key={fiche.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4">{fiche.nom_etudiant}</td>
                  <td className="p-4">{fiche.nom_formateur}</td>
                  <td className="p-4">{fiche.total_formation ?? 0} h</td>
                  <td className="p-4">{fiche.total_pratique ?? 0} h</td>
                  <td className="p-4">{fiche.total_heures} h</td>
                  <td className="p-4">
                    <StatusSelector id={fiche.id} statut={fiche.statut} />
                  </td>

                  <td className="p-4 space-x-2 whitespace-nowrap">
                    <Link
                      href={`/attendance/${fiche.id}`}
                      className="text-green-700 hover:underline"
                    >
                      Voir
                    </Link>

                    <DeleteAttendanceButton id={fiche.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

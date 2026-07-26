"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerEvaluations();
  }, []);

  async function chargerEvaluations() {
    const { data } = await supabase
      .from("evaluations")
      .select("*")
      .order("session_id");

    setEvaluations(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Mes évaluations
        </h1>

        <table className="w-full">

          <thead>
            <tr className="border-b">

              <th className="p-3 text-left">
                Session
              </th>

              <th className="p-3 text-left">
                Type
              </th>

              <th className="p-3 text-left">
                Titre
              </th>

              <th className="p-3 text-left">
                Statut
              </th>

            </tr>
          </thead>

          <tbody>

            {evaluations.map((evaluation) => (
              <tr
                key={evaluation.id}
                className="border-b"
              >
                <td className="p-3">
                  {evaluation.session_id}
                </td>

                <td className="p-3">
                  {evaluation.type}
                </td>

                <td className="p-3">
                  {evaluation.titre}
                </td>

                <td className="p-3">
                  À compléter
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>
    </div>
  );
}

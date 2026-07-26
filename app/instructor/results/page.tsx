"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function InstructorResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerResultats();
  }, []);

  async function chargerResultats() {
    const { data } = await supabase
      .from("quiz_results")
      .select("*")
      .order("date_passage", {
        ascending: false,
      });

    setResults(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Résultats des étudiants
        </h1>

        <table className="w-full">

          <thead>
            <tr className="border-b">

              <th className="p-3 text-left">
                Étudiant
              </th>

              <th className="p-3 text-left">
                Session
              </th>

              <th className="p-3 text-left">
                Score
              </th>

              <th className="p-3 text-left">
                Pourcentage
              </th>

              <th className="p-3 text-left">
                Date
              </th>

            </tr>
          </thead>

          <tbody>

            {results.map((result) => (
              <tr
                key={result.id}
                className="border-b"
              >
                <td className="p-3">
                  {result.utilisateur}
                </td>

                <td className="p-3">
                  {result.session_id}
                </td>

                <td className="p-3">
                  {result.score}
                </td>

                <td className="p-3">
                  {Number(
                    result.pourcentage
                  ).toFixed(2)} %
                </td>

                <td className="p-3">
                  {new Date(
                    result.date_passage
                  ).toLocaleString("fr-CA")}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function StudentResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerResultats();
  }, []);

  async function chargerResultats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("quiz_results")
      .select(`
        *,
        sessions (
          titre
        )
      `)
      .eq("user_id", user.id)
      .order("date_passage", {
        ascending: false,
      });

    setResults(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Mes résultats" backHref="/student" backLabel="← Portail étudiant" />

        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3 font-medium">Session</th>
                <th className="p-3 font-medium">Score</th>
                <th className="p-3 font-medium">Pourcentage</th>
                <th className="p-3 font-medium">Date</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b last:border-0">
                  <td className="p-3">{result.sessions?.titre}</td>
                  <td className="p-3">{result.score}</td>
                  <td className="p-3">
                    {Number(result.pourcentage).toFixed(2)} %
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(result.date_passage).toLocaleString("fr-CA")}
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

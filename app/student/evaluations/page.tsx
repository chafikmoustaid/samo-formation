"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Mes évaluations" backHref="/student" backLabel="← Portail étudiant" />

        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3 font-medium">Session</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Titre</th>
                <th className="p-3 font-medium">Statut</th>
              </tr>
            </thead>

            <tbody>
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="border-b last:border-0">
                  <td className="p-3">{evaluation.session_id}</td>
                  <td className="p-3">{evaluation.type}</td>
                  <td className="p-3">{evaluation.titre}</td>
                  <td className="p-3">À compléter</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

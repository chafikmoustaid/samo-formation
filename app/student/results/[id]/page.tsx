"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import SeanceNav from "@/components/student/SeanceNav";

export default function StudentSessionResultsPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [titre, setTitre] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) chargerResultats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function chargerResultats() {
    setLoading(true);

    // Le lien vient de /student/courses avec course.id — on résout vers
    // le numéro de séance, comme pour le support, le quiz et le TP.
    const { data: course } = await supabase
      .from("courses")
      .select("session_id, titre")
      .eq("id", Number(courseId))
      .single();

    if (!course) {
      setLoading(false);
      return;
    }

    setTitre(course.titre);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", course.session_id)
      .order("date_passage", { ascending: false });

    setResults(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <SeanceNav courseId={courseId} current="resultats" />

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Résultats — {titre || "Séance"}
        </h1>

        <Card>
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Aucun quiz complété pour cette séance pour le moment.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3 font-medium">Score</th>
                  <th className="p-3 font-medium">Pourcentage</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>

              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b last:border-0">
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
          )}
        </Card>
      </div>
    </div>
  );
}

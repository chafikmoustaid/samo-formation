"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link
          href="/student/courses"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Mes cours
        </Link>

        <h1 className="text-3xl font-bold text-green-700 mt-4 mb-6">
          Résultats — {titre || "Séance"}
        </h1>

        {results.length === 0 ? (
          <p className="text-gray-500">
            Aucun quiz complété pour cette séance pour le moment.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">Score</th>
                <th className="p-3 text-left">Pourcentage</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b">
                  <td className="p-3">{result.score}</td>
                  <td className="p-3">
                    {Number(result.pourcentage).toFixed(2)} %
                  </td>
                  <td className="p-3">
                    {new Date(result.date_passage).toLocaleString("fr-CA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

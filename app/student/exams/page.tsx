"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function StudentExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>(
    {}
  );
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerExamens();
  }, []);

  async function chargerExamens() {
    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("*")
      .in("type", ["examen_partiel", "examen_final"])
      .order("session_id");

    setExams(evaluations ?? []);

    if (evaluations && evaluations.length > 0) {
      const ids = evaluations.map((e) => e.id);

      const { data: questions } = await supabase
        .from("exam_questions")
        .select("evaluation_id")
        .in("evaluation_id", ids);

      const counts: Record<number, number> = {};
      (questions ?? []).forEach((q) => {
        counts[q.evaluation_id] = (counts[q.evaluation_id] ?? 0) + 1;
      });
      setQuestionCounts(counts);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: mesResultats } = await supabase
          .from("exam_results")
          .select("*")
          .eq("user_id", user.id)
          .in("evaluation_id", ids)
          .order("date_passage", { ascending: false });

        setResults(mesResultats ?? []);
      }
    }

    setLoading(false);
  }

  function dernierResultat(evaluationId: number) {
    return results.find((r) => r.evaluation_id === evaluationId);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Mes examens
        </h1>

        {exams.length === 0 && (
          <p className="text-gray-500">Aucun examen publié pour le moment.</p>
        )}

        <div className="space-y-6">

          {exams.map((exam) => {
            const nbQuestions = questionCounts[exam.id] ?? 0;
            const resultat = dernierResultat(exam.id);

            return (
              <div
                key={exam.id}
                className="border rounded-xl p-6"
              >
                <h2 className="text-2xl font-bold">
                  {exam.titre}
                </h2>

                <p className="mt-2">
                  Séance : {exam.session_id}
                </p>

                <p>
                  Type : {exam.type}
                </p>

                {resultat && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm">
                    ✅ Complété le{" "}
                    {new Date(resultat.date_passage).toLocaleString("fr-CA")}
                    {" — "}
                    {Number(resultat.pourcentage).toFixed(0)} %
                  </div>
                )}

                {nbQuestions > 0 ? (
                  <Link
                    href={`/student/exams/${exam.id}`}
                    className="mt-4 inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    {resultat ? "Repasser l'examen" : "Commencer l'examen"}
                  </Link>
                ) : (
                  <p className="mt-4 text-sm text-gray-400">
                    Bientôt disponible — questions pas encore publiées.
                  </p>
                )}

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}

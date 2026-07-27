"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Mes examens" backHref="/student" backLabel="← Portail étudiant" />

        {exams.length === 0 && (
          <p className="text-gray-500 text-sm">
            Aucun examen publié pour le moment.
          </p>
        )}

        <div className="space-y-4">
          {exams.map((exam) => {
            const nbQuestions = questionCounts[exam.id] ?? 0;
            const resultat = dernierResultat(exam.id);

            return (
              <Card key={exam.id}>
                <h2 className="text-lg font-semibold text-gray-900">
                  {exam.titre}
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Séance : {exam.session_id}
                </p>

                <p className="text-sm text-gray-600">Type : {exam.type}</p>

                {resultat && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm">
                    ✅ Complété le{" "}
                    {new Date(resultat.date_passage).toLocaleString("fr-CA")}
                    {" — "}
                    {Number(resultat.pourcentage).toFixed(0)} %
                  </div>
                )}

                {nbQuestions > 0 ? (
                  <div className="mt-4">
                    <LinkButton href={`/student/exams/${exam.id}`} variant="primary" size="sm">
                      {resultat ? "Repasser l'examen" : "Commencer l'examen"}
                    </LinkButton>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-400">
                    Bientôt disponible — questions pas encore publiées.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

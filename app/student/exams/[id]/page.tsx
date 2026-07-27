"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function StudentExamPage() {
  const params = useParams<{ id: string }>();
  const evaluationId = Number(params.id);

  const [evaluation, setEvaluation] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [reponses, setReponses] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [bonnesReponses, setBonnesReponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (evaluationId) chargerExamen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId]);

  async function chargerExamen() {
    setLoading(true);

    const { data: evalData } = await supabase
      .from("evaluations")
      .select("*")
      .eq("id", evaluationId)
      .single();

    setEvaluation(evalData ?? null);

    const { data } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("evaluation_id", evaluationId)
      .order("id");

    setQuestions(data ?? []);
    setLoading(false);
  }

  function choisirReponse(questionId: number, valeur: string) {
    setReponses((prev) => ({ ...prev, [questionId]: valeur }));
  }

  async function soumettreExamen() {
    let correctes = 0;

    questions.forEach((question) => {
      if (reponses[question.id] === question.bonne_reponse) {
        correctes++;
      }
    });

    const pourcentage = (correctes / questions.length) * 100;

    setBonnesReponses(correctes);
    setScore(pourcentage);
    setEnvoi(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("exam_results").insert({
        user_id: user.id,
        utilisateur: user.email,
        evaluation_id: evaluationId,
        exam_type: evaluation?.type ?? null,
        score: correctes,
        pourcentage,
        date_passage: new Date().toISOString(),
      });
    }

    setEnvoi(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!evaluation) {
    return <div className="p-8 text-gray-500">Examen introuvable.</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Examen"
            backHref="/student/exams"
            backLabel="← Mes examens"
          />
          <Card>Aucune question publiée pour cet examen pour le moment.</Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={evaluation.titre}
          backHref="/student/exams"
          backLabel="← Mes examens"
        />

        <Card>
          {questions.map((question, index) => (
            <div key={question.id} className="mb-8 border-b border-gray-100 pb-6 last:border-0 last:mb-0 last:pb-0">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Question {index + 1}
              </h2>

              <p className="mb-4 text-sm text-gray-700">{question.question}</p>

              {(["A", "B", "C", "D"] as const)
                .filter((lettre) => question[`choix_${lettre.toLowerCase()}`])
                .map((lettre) => (
                  <label key={lettre} className="block mb-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={lettre}
                      checked={reponses[question.id] === lettre}
                      onChange={() => choisirReponse(question.id, lettre)}
                      className="mr-2"
                    />
                    {question[`choix_${lettre.toLowerCase()}`]}
                  </label>
                ))}
            </div>
          ))}

          <Button
            variant="danger"
            onClick={soumettreExamen}
            disabled={envoi || score !== null}
          >
            {score !== null ? "Examen soumis" : "Soumettre l'examen"}
          </Button>

          {score !== null && (
            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900">Résultat</h2>
              <p className="mt-2 text-sm text-gray-700">
                {bonnesReponses} / {questions.length} bonnes réponses —{" "}
                {score.toFixed(0)} %
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

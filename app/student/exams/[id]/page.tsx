"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
    return <div className="p-8">Chargement...</div>;
  }

  if (!evaluation) {
    return <div className="p-8">Examen introuvable.</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
          Aucune question publiée pour cet examen pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link
          href="/student/exams"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Mes examens
        </Link>

        <h1 className="text-3xl font-bold text-green-700 mt-4 mb-8">
          {evaluation.titre}
        </h1>

        {questions.map((question, index) => (
          <div key={question.id} className="mb-8 border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">
              Question {index + 1}
            </h2>

            <p className="mb-4">{question.question}</p>

            {(["A", "B", "C", "D"] as const)
              .filter((lettre) => question[`choix_${lettre.toLowerCase()}`])
              .map((lettre) => (
                <label key={lettre} className="block mb-2">
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

        <button
          onClick={soumettreExamen}
          disabled={envoi || score !== null}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-6 py-3 rounded-lg"
        >
          {score !== null ? "Examen soumis" : "Soumettre l'examen"}
        </button>

        {score !== null && (
          <div className="mt-8 p-6 bg-green-50 border border-green-300 rounded-lg">
            <h2 className="text-2xl font-bold">Résultat</h2>
            <p className="mt-2">
              {bonnesReponses} / {questions.length} bonnes réponses —{" "}
              {score.toFixed(0)} %
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

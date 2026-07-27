"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function StudentQuizPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [reponses, setReponses] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    chargerQuestions();
  }, []);

  async function chargerQuestions() {
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("session_id", 1);

    setQuestions(data ?? []);
  }

  function choisirReponse(questionId: number, valeur: string) {
    setReponses((prev) => ({
      ...prev,
      [questionId]: valeur,
    }));
  }

  async function soumettreQuiz() {
    let bonnesReponses = 0;

    questions.forEach((question) => {
      if (reponses[question.id] === question.bonne_reponse) {
        bonnesReponses++;
      }
    });

    const pourcentage = (bonnesReponses / questions.length) * 100;

    setScore(pourcentage);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("quiz_results").insert({
      user_id: user.id,
      utilisateur: user.email,
      session_id: 1,
      score: bonnesReponses,
      pourcentage,
      date_passage: new Date().toISOString(),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Quiz : Introduction à l'informatique"
          backHref="/student"
          backLabel="← Portail étudiant"
        />

        <Card>
          {questions.map((question, index) => (
            <div key={question.id} className="mb-8 border-b border-gray-100 pb-6 last:border-0 last:mb-0 last:pb-0">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Question {index + 1}
              </h2>

              <p className="mb-4 text-sm text-gray-700">{question.question}</p>

              {[
                ["A", question.choix_a],
                ["B", question.choix_b],
                ["C", question.choix_c],
                ["D", question.choix_d],
              ].map(([lettre, texte]) => (
                <label key={lettre} className="block mb-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={lettre}
                    checked={reponses[question.id] === lettre}
                    onChange={() => choisirReponse(question.id, lettre)}
                    className="mr-2"
                  />
                  {texte}
                </label>
              ))}
            </div>
          ))}

          <Button onClick={soumettreQuiz}>Soumettre le quiz</Button>

          {score !== null && (
            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900">Résultat</h2>
              <p className="mt-2 text-sm text-gray-700">
                Score : {score.toFixed(2)} %
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

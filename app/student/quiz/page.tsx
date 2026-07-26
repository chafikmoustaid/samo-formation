"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  function choisirReponse(
    questionId: number,
    valeur: string
  ) {
    setReponses((prev) => ({
      ...prev,
      [questionId]: valeur,
    }));
  }

  async function soumettreQuiz() {
    let bonnesReponses = 0;

    questions.forEach((question) => {
      if (
        reponses[question.id] ===
        question.bonne_reponse
      ) {
        bonnesReponses++;
      }
    });

    const pourcentage =
      (bonnesReponses / questions.length) * 100;

    setScore(pourcentage);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("quiz_results")
      .insert({
        user_id: user.id,
        utilisateur: user.email,
        session_id: 1,
        score: bonnesReponses,
        pourcentage,
        date_passage: new Date().toISOString(),
      });
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Quiz : Introduction à l'informatique
        </h1>

        {questions.map((question, index) => (
          <div
            key={question.id}
            className="mb-8 border-b pb-6"
          >
            <h2 className="text-xl font-semibold mb-4">
              Question {index + 1}
            </h2>

            <p className="mb-4">
              {question.question}
            </p>

            {[
              ["A", question.choix_a],
              ["B", question.choix_b],
              ["C", question.choix_c],
              ["D", question.choix_d],
            ].map(([lettre, texte]) => (
              <label
                key={lettre}
                className="block mb-2"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={lettre}
                  checked={
                    reponses[question.id] === lettre
                  }
                  onChange={() =>
                    choisirReponse(
                      question.id,
                      lettre
                    )
                  }
                  className="mr-2"
                />

                {texte}
              </label>
            ))}
          </div>
        ))}

        <button
          onClick={soumettreQuiz}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
        >
          Soumettre le quiz
        </button>

        {score !== null && (
          <div className="mt-8 p-6 bg-green-50 border border-green-300 rounded-lg">

            <h2 className="text-2xl font-bold">
              Résultat
            </h2>

            <p className="mt-2">
              Score : {score.toFixed(2)} %
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

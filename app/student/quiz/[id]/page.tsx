"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StudentQuizDynamicPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [titre, setTitre] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [reponses, setReponses] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [bonnesReponses, setBonnesReponses] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      chargerQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function resolveSessionId(): Promise<number | null> {
    const { data: course } = await supabase
      .from("courses")
      .select("session_id")
      .eq("id", Number(courseId))
      .single();

    if (!course) return null;

    // quiz_questions.session_id référence sessions.id, pas le numéro de
    // séance affiché ailleurs (courses.session_id) — il faut résoudre
    // via sessions.numero.
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("numero", course.session_id)
      .single();

    return session?.id ?? null;
  }

  async function chargerQuestions() {
    setLoading(true);

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("session_id, titre")
      .eq("id", Number(courseId))
      .single();

    if (courseError || !course) {
      setErreur("Cours introuvable.");
      setLoading(false);
      return;
    }

    setTitre(course.titre);

    const sessionId = await resolveSessionId();

    if (!sessionId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("id");

    setQuestions(data ?? []);
    setLoading(false);
  }

  function choisirReponse(questionId: number, valeur: string) {
    setReponses((prev) => ({
      ...prev,
      [questionId]: valeur,
    }));
  }

  async function soumettreQuiz() {
    let correctes = 0;

    questions.forEach((question) => {
      if (reponses[question.id] === question.bonne_reponse) {
        correctes++;
      }
    });

    const pourcentage = (correctes / questions.length) * 100;

    setBonnesReponses(correctes);
    setScore(pourcentage);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const sessionId = await resolveSessionId();

    if (!sessionId) return;

    await supabase.from("quiz_results").insert({
      user_id: user.id,
      utilisateur: user.email,
      session_id: sessionId,
      score: correctes,
      pourcentage,
      date_passage: new Date().toISOString(),
    });
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (erreur) {
    return <div className="p-8 text-red-600">{erreur}</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
          Aucun quiz disponible pour cette séance pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Quiz : {titre}
        </h1>

        {questions.map((question, index) => (
          <div key={question.id} className="mb-8 border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">
              Question {index + 1}
            </h2>

            <p className="mb-4">{question.question}</p>

            {(["A", "B", "C", "D"] as const)
              .filter(
                (lettre) =>
                  question[`choix_${lettre.toLowerCase()}`]
              )
              .map((lettre) => (
                <label key={lettre} className="block mb-2">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={lettre}
                    checked={reponses[question.id] === lettre}
                    onChange={() =>
                      choisirReponse(question.id, lettre)
                    }
                    className="mr-2"
                  />
                  {question[`choix_${lettre.toLowerCase()}`]}
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

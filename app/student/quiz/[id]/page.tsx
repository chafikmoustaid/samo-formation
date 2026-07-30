"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SeanceNav from "@/components/student/SeanceNav";

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
    // courses.session_id référence directement sessions.id.
    const { data: course } = await supabase
      .from("courses")
      .select("session_id")
      .eq("id", Number(courseId))
      .single();

    return course?.session_id ?? null;
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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (erreur) {
    return <div className="p-8 text-red-600">{erreur}</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <SeanceNav courseId={courseId} current="quiz" />
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {titre || "Quiz"}
          </h1>
          <Card>Aucun quiz disponible pour cette séance pour le moment.</Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <SeanceNav courseId={courseId} current="quiz" />
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Quiz : {titre}
        </h1>

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

          <Button onClick={soumettreQuiz}>Soumettre le quiz</Button>

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

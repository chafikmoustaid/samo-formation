"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

type Hub = {
  numero: number;
  titre: string;
  courseId: number | null;
  hasQuiz: boolean;
  hasSupport: boolean;
  tpEvaluation: { id: number; type: string } | null;
  examEvaluation: { id: number; type: string } | null;
};

export default function SeanceHubPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const matiereId = params.id;
  const sessionId = params.sessionId;

  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) chargerHub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function chargerHub() {
    setLoading(true);
    setErreur(null);

    const { data: session } = await supabase
      .from("sessions")
      .select("numero, titre")
      .eq("id", Number(sessionId))
      .single();

    if (!session) {
      setErreur("Séance introuvable.");
      setLoading(false);
      return;
    }

    const [courseRes, quizRes, evalRes, lessonRes] = await Promise.all([
      supabase
        .from("courses")
        .select("id")
        .eq("session_id", Number(sessionId))
        .maybeSingle(),
      supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", Number(sessionId)),
      supabase
        .from("evaluations")
        .select("id, type")
        .eq("session_id", Number(sessionId))
        .eq("actif", true),
      supabase
        .from("course_lessons")
        .select("id")
        .eq("session_id", Number(sessionId))
        .maybeSingle(),
    ]);

    const evaluationsSeance = evalRes.data ?? [];
    const tpEvaluation =
      evaluationsSeance.find((e: any) => e.type === "tp") ?? null;
    const examEvaluation =
      evaluationsSeance.find((e: any) =>
        ["examen_partiel", "examen_final", "test"].includes(e.type)
      ) ?? null;

    setHub({
      numero: session.numero,
      titre: session.titre,
      courseId: courseRes.data?.id ?? null,
      hasQuiz: (quizRes.count ?? 0) > 0,
      hasSupport: !!lessonRes.data,
      tpEvaluation,
      examEvaluation,
    });

    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement…</div>;
  }

  if (erreur || !hub) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Séance"
            backHref={`/student/matieres/${matiereId}`}
            backLabel="← Retour à la matière"
          />
          <Card>
            <p className="text-sm text-red-600">
              {erreur ?? "Séance introuvable."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const estTp = !!hub.tpEvaluation;
  const estExamen = !!hub.examEvaluation;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title={`Séance ${hub.numero} — ${hub.titre}`}
          backHref={`/student/matieres/${matiereId}`}
          backLabel="← Retour à la matière"
        />

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Que veux-tu faire ?
          </h2>

          <div className="flex flex-wrap gap-3">
            {hub.courseId && hub.hasSupport ? (
              <LinkButton
                href={`/student/courses/${hub.courseId}`}
                variant="primary"
              >
                Support de cours
              </LinkButton>
            ) : (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm bg-gray-100 text-gray-400">
                Support de cours — bientôt disponible
              </span>
            )}

            {hub.courseId && hub.hasQuiz ? (
              <LinkButton
                href={`/student/quiz/${hub.courseId}`}
                variant="outline"
              >
                Quiz
              </LinkButton>
            ) : (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm bg-gray-100 text-gray-400">
                Quiz — bientôt disponible
              </span>
            )}

            {hub.courseId && hub.tpEvaluation && (
              <LinkButton
                href={`/student/assignments/${hub.courseId}`}
                variant="outline"
              >
                TP / Test
              </LinkButton>
            )}

            {hub.examEvaluation && (
              <LinkButton
                href={`/student/exams/${hub.examEvaluation.id}`}
                variant="outline"
              >
                Examen
              </LinkButton>
            )}

            {!estTp && !estExamen && (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm bg-gray-100 text-gray-400">
                TP / Examen — bientôt disponible
              </span>
            )}

            {hub.courseId && (
              <LinkButton
                href={`/student/results/${hub.courseId}`}
                variant="outline"
              >
                Mes résultats
              </LinkButton>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

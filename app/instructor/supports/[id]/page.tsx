"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SupportCompare from "./SupportCompare";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import ColorLinkButton from "@/components/ui/ColorLinkButton";
import { couleurPalette } from "@/lib/paletteCouleurs";

export default function InstructorSupportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [lesson, setLesson] = useState<any>(null);
  const [session, setSession] = useState<{
    matiereId: number | null;
    hasQuiz: boolean;
    tpEvaluation: { id: number; type: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) chargerSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chargerSupport() {
    setLoading(true);

    const [lessonRes, sessionRes, quizRes, evalRes] = await Promise.all([
      supabase
        .from("course_lessons")
        .select("*")
        .eq("session_id", Number(id))
        .single(),
      supabase
        .from("sessions")
        .select("matiere_id")
        .eq("id", Number(id))
        .single(),
      supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", Number(id)),
      supabase
        .from("evaluations")
        .select("id, type")
        .eq("session_id", Number(id))
        .eq("actif", true),
    ]);

    const evaluationsSeance = evalRes.data ?? [];
    const tpEvaluation =
      evaluationsSeance.find((e: any) => e.type === "tp") ?? null;

    setLesson(lessonRes.data ?? null);
    setSession({
      matiereId: (sessionRes.data as any)?.matiere_id ?? null,
      hasQuiz: (quizRes.count ?? 0) > 0,
      tpEvaluation,
    });
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>Support introuvable pour la séance {id}.</Card>
        </div>
      </div>
    );
  }

  const backHref =
    session?.matiereId != null
      ? `/instructor/matieres/${session.matiereId}/seances/${id}`
      : "/instructor";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={lesson.titre ?? `Séance ${id}`}
          backHref={backHref}
          backLabel="← Retour à la séance"
        />

        <div className="flex flex-wrap gap-3 mb-6">
          {session?.hasQuiz && (
            <ColorLinkButton
              href={`/instructor/results?session=${id}`}
              color={couleurPalette(0)}
            >
              Résultats du quiz
            </ColorLinkButton>
          )}

          <ColorLinkButton href={`/instructor/tp/${id}`} color={couleurPalette(1)}>
            TP
          </ColorLinkButton>

          {session?.tpEvaluation && (
            <ColorLinkButton
              href="/instructor/assignments"
              color={couleurPalette(2)}
            >
              Corriger les remises
            </ColorLinkButton>
          )}
        </div>

        <SupportCompare
          htmlFidele={lesson.html_fidele ?? null}
          htmlPedagogique={lesson.html_pedagogique ?? null}
          auditReport={lesson.audit_report ?? null}
        />
      </div>
    </div>
  );
}

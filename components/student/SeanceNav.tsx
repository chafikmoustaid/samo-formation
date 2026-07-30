"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Onglet = "support" | "quiz" | "tp" | "resultats";

type Info = {
  matiereId: number | null;
  matiereNom: string;
  sessionId: number | null;
  numero: number | null;
  titre: string;
  courseId: number | null;
  hasSupport: boolean;
  hasQuiz: boolean;
  tpEvaluationId: number | null;
  examEvaluationId: number | null;
};

// Barre de navigation partagée par les pages de détail d'une séance
// (support, quiz, TP, résultats) : fil d'ariane vers la matière et la
// séance, plus des raccourcis vers les autres actions de la même séance,
// pour ne jamais être obligé de repasser par "Mes cours".
export default function SeanceNav({
  courseId,
  current,
}: {
  courseId: string | number;
  current: Onglet;
}) {
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    let active = true;

    async function charger() {
      const { data: course } = await supabase
        .from("courses")
        .select("id, session_id, titre")
        .eq("id", Number(courseId))
        .single();

      if (!course || !active) return;

      const { data: session } = await supabase
        .from("sessions")
        .select("numero, matiere_id")
        .eq("id", course.session_id)
        .single();

      let matiereNom = "Matière";
      if (session?.matiere_id) {
        const { data: matiere } = await supabase
          .from("matieres")
          .select("nom")
          .eq("id", session.matiere_id)
          .single();
        matiereNom = matiere?.nom ?? "Matière";
      }

      const [quizRes, evalRes, lessonRes] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("id", { count: "exact", head: true })
          .eq("session_id", course.session_id),
        supabase
          .from("evaluations")
          .select("id, type")
          .eq("session_id", course.session_id)
          .eq("actif", true),
        supabase
          .from("course_lessons")
          .select("id")
          .eq("session_id", course.session_id)
          .maybeSingle(),
      ]);

      if (!active) return;

      const evaluations = evalRes.data ?? [];
      const tpEvaluation = evaluations.find((e: any) => e.type === "tp") ?? null;
      const examEvaluation =
        evaluations.find((e: any) =>
          ["examen_partiel", "examen_final", "test"].includes(e.type)
        ) ?? null;

      setInfo({
        matiereId: session?.matiere_id ?? null,
        matiereNom,
        sessionId: course.session_id,
        numero: session?.numero ?? null,
        titre: course.titre,
        courseId: course.id,
        hasSupport: !!lessonRes.data,
        hasQuiz: (quizRes.count ?? 0) > 0,
        tpEvaluationId: tpEvaluation?.id ?? null,
        examEvaluationId: examEvaluation?.id ?? null,
      });
    }

    if (courseId) charger();

    return () => {
      active = false;
    };
  }, [courseId]);

  if (!info) return null;

  const onglets: { key: Onglet; label: string; href: string; actif: boolean }[] = [
    {
      key: "support",
      label: "Support de cours",
      href: `/student/courses/${info.courseId}`,
      actif: info.hasSupport,
    },
    {
      key: "quiz",
      label: "Quiz",
      href: `/student/quiz/${info.courseId}`,
      actif: info.hasQuiz,
    },
    {
      key: "tp",
      label: "TP / Test",
      href: `/student/assignments/${info.courseId}`,
      actif: !!info.tpEvaluationId,
    },
    {
      key: "resultats",
      label: "Mes résultats",
      href: `/student/results/${info.courseId}`,
      actif: true,
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 flex-wrap text-sm text-gray-500">
        <Link href="/student" className="hover:underline">
          Portail étudiant
        </Link>
        <span>/</span>
        {info.matiereId ? (
          <Link
            href={`/student/matieres/${info.matiereId}`}
            className="hover:underline"
          >
            {info.matiereNom}
          </Link>
        ) : (
          <span>{info.matiereNom}</span>
        )}
        <span>/</span>
        {info.matiereId && info.sessionId ? (
          <Link
            href={`/student/matieres/${info.matiereId}/seances/${info.sessionId}`}
            className="hover:underline"
          >
            Séance {info.numero}
          </Link>
        ) : (
          <span>Séance {info.numero}</span>
        )}

        {info.examEvaluationId && (
          <>
            <span>/</span>
            <Link
              href={`/student/exams/${info.examEvaluationId}`}
              className="hover:underline"
            >
              Examen
            </Link>
          </>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mt-3">
        {onglets.map((o) =>
          o.key === current ? (
            <span
              key={o.key}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-green-700 text-white"
            >
              {o.label}
            </span>
          ) : o.actif ? (
            <Link
              key={o.key}
              href={o.href}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {o.label}
            </Link>
          ) : (
            <span
              key={o.key}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-400"
            >
              {o.label}
            </span>
          )
        )}
      </div>
    </div>
  );
}

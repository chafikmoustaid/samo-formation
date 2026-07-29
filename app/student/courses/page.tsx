"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let sessionIds: number[] | null = null;

    if (user) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("formation_id")
        .eq("id", user.id)
        .single();

      if (profil?.formation_id) {
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("id")
          .eq("formation_id", profil.formation_id);

        sessionIds = (sessionsData ?? []).map((s) => s.id);
      }
    }

    let coursesQuery = supabase.from("courses").select("*").order("session_id");

    if (sessionIds) {
      coursesQuery = coursesQuery.in("session_id", sessionIds);
    }

    const { data: coursesData, error: coursesError } = await coursesQuery;

    if (coursesError) {
      setError("Erreur lors du chargement des cours.");
      return;
    }

    setCourses(coursesData ?? []);

    if (!user) return;

    const { data: quizData } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("user_id", user.id);

    setQuizResults(quizData ?? []);

    const { data: tpData } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", user.id);

    setSubmissions(tpData ?? []);
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Mes cours" backHref="/student" backLabel="← Portail étudiant" />

        <div className="space-y-4">
          {courses.map((course) => {
            const quizComplete = quizResults.some(
              (q) => q.session_id === course.session_id
            );

            const tpComplete = submissions.length > 0;

            return (
              <Card key={course.id}>
                <h2 className="text-lg font-semibold text-gray-900">
                  {course.titre}
                </h2>

                <p className="mt-2 text-gray-600 text-sm">
                  {course.description}
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  Séance : {course.session_id}
                </p>

                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <p>{quizComplete ? "Quiz complété" : "Quiz à faire"}</p>
                  <p>{tpComplete ? "TP remis" : "TP à remettre"}</p>
                </div>

                <div className="flex flex-wrap gap-3 mt-5">
                  <LinkButton
                    href={`/student/courses/${course.id}`}
                    variant="outline"
                    size="sm"
                  >
                    Support
                  </LinkButton>

                  <LinkButton
                    href={`/student/quiz/${course.id}`}
                    variant="outline"
                    size="sm"
                  >
                    Quiz
                  </LinkButton>

                  <LinkButton
                    href={`/student/assignments/${course.id}`}
                    variant="outline"
                    size="sm"
                  >
                    TP
                  </LinkButton>

                  <LinkButton
                    href={`/student/results/${course.id}`}
                    variant="outline"
                    size="sm"
                  >
                    Résultats
                  </LinkButton>

                  <LinkButton href="/student/exams" variant="outline" size="sm">
                    Examens
                  </LinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

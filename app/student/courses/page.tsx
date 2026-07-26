"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

    const { data: coursesData, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .order("session_id");

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
    return (
      <div className="p-8 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Mes cours
        </h1>

        <div className="space-y-6">

          {courses.map((course) => {
            const quizComplete = quizResults.some(
              (q) => q.session_id === course.session_id
            );

            const tpComplete = submissions.length > 0;

            return (
              <div
                key={course.id}
                className="border rounded-xl p-6"
              >
                <h2 className="text-2xl font-bold">
                  {course.titre}
                </h2>

                <p className="mt-2 text-gray-700">
                  {course.description}
                </p>

                <p className="mt-4">
                  Séance : {course.session_id}
                </p>

                <div className="mt-4 space-y-2">
                  <p>
                    {quizComplete
                      ? "✅ Quiz complété"
                      : "⏳ Quiz à faire"}
                  </p>

                  <p>
                    {tpComplete
                      ? "✅ TP remis"
                      : "⏳ TP à remettre"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">

                  <Link
                    href={`/student/courses/${course.id}`}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                  >
                    📄 Support
                  </Link>

                  <Link
                    href={`/student/quiz/${course.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    📝 Quiz
                  </Link>

                  <Link
                    href={`/student/assignments/${course.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    🛠 TP
                  </Link>

                  <Link
                    href={`/student/results/${course.id}`}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    📊 Résultats
                  </Link>

                  <Link
                    href="/student/exams"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    📝 Examens
                  </Link>

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}

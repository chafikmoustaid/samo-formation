"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerCours();
  }, []);

  async function chargerCours() {
    setLoading(true);

    const { data, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .order("session_id");

    if (coursesError) {
      setError("Erreur lors du chargement des séances.");
      setLoading(false);
      return;
    }

    setCourses(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-green-700">
            Toutes les séances
          </h1>

          <Link
            href="/instructor"
            className="text-sm text-gray-500 hover:underline"
          >
            ← Portail formateur
          </Link>
        </div>

        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm text-gray-500">
                  Séance {course.session_id}
                </p>
                <h2 className="text-xl font-bold">{course.titre}</h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/instructor/supports/${course.session_id}`}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  📄 Support
                </Link>

                <Link
                  href={`/instructor/tp/${course.session_id}`}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
                >
                  🧪 TP
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

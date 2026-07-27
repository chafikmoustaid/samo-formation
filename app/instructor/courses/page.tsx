"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Toutes les séances"
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <Card className="p-4">
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="border border-gray-100 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm text-gray-500">
                    Séance {course.session_id}
                  </p>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {course.titre}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <LinkButton
                    href={`/instructor/supports/${course.session_id}`}
                    variant="outline"
                    size="sm"
                  >
                    Support
                  </LinkButton>

                  <LinkButton
                    href={`/instructor/tp/${course.session_id}`}
                    variant="outline"
                    size="sm"
                  >
                    TP
                  </LinkButton>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

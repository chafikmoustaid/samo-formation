"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SupportCompare from "./SupportCompare";

export default function InstructorSupportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) chargerSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chargerSupport() {
    setLoading(true);

    const { data } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("session_id", Number(id))
      .single();

    setLesson(data ?? null);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
          Support introuvable pour la séance {id}.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/instructor"
            className="text-sm text-gray-500 hover:underline"
          >
            ← Portail formateur
          </Link>

          <Link
            href="/instructor/import-support"
            className="text-sm text-green-700 hover:underline"
          >
            Publier / mettre à jour un support →
          </Link>
        </div>

        <SupportCompare
          titre={lesson.titre ?? `Séance ${id}`}
          htmlFidele={lesson.html_fidele ?? null}
          htmlPedagogique={lesson.html_pedagogique ?? null}
          integrityScore={lesson.integrity_score ?? null}
          auditReport={lesson.audit_report ?? null}
        />
      </div>
    </div>
  );
}

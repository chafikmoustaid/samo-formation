"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TpCompare from "./TpCompare";

export default function InstructorTpPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) chargerTp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chargerTp() {
    setLoading(true);

    const { data: evaluation } = await supabase
      .from("evaluations")
      .select("*, assignments(*)")
      .eq("session_id", Number(id))
      .eq("type", "tp")
      .maybeSingle();

    setAssignment(evaluation?.assignments?.[0] ?? null);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
          <Link
            href="/instructor"
            className="text-sm text-gray-500 hover:underline"
          >
            ← Portail formateur
          </Link>
          <p className="mt-4">
            Aucun TP publié pour la séance {id}.
          </p>
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
            href="/instructor/assignments"
            className="text-sm text-green-700 hover:underline"
          >
            Voir les remises des étudiants →
          </Link>
        </div>

        <TpCompare
          titre={assignment.titre ?? `TP séance ${id}`}
          contenuHtml={assignment.contenu_html ?? null}
          corrigeHtml={assignment.corrige_html ?? null}
          description={assignment.description ?? null}
        />
      </div>
    </div>
  );
}

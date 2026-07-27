"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TpCompare from "./TpCompare";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

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
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title={`Séance ${id}`}
            backHref="/instructor"
            backLabel="← Portail formateur"
          />
          <Card>Aucun TP publié pour la séance {id}.</Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={assignment.titre ?? `TP séance ${id}`}
          backHref="/instructor"
          backLabel="← Portail formateur"
          action={
            <Link
              href="/instructor/assignments"
              className="text-sm text-green-700 hover:underline"
            >
              Voir les remises des étudiants →
            </Link>
          }
        />

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

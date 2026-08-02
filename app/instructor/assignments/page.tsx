"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

function fichierUrl(chemin: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tp-submissions/${chemin}`;
}

function nomFichier(chemin: string) {
  const base = chemin.split("/").pop() ?? chemin;
  // enlève le préfixe timestamp "1784868804241-"
  return base.replace(/^\d+-/, "");
}

function InstructorAssignmentsContent() {
  const searchParams = useSearchParams();
  const filtre = searchParams.get("filtre"); // "a_corriger" ou absent (toutes)

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerRemises();
  }, []);

  async function chargerRemises() {
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .order("date_remise", {
        ascending: false,
      });

    setSubmissions(data ?? []);

    const { data: tps } = await supabase
      .from("assignments")
      .select("id, titre");

    const map: Record<string, string> = {};
    (tps ?? []).forEach((tp) => {
      map[String(tp.id)] = tp.titre;
    });
    setAssignments(map);

    setLoading(false);
  }

  const submissionsFiltrees = useMemo(() => {
    if (filtre === "a_corriger") {
      return submissions.filter((s) => s.note === null);
    }
    return submissions;
  }, [submissions, filtre]);

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={
            filtre === "a_corriger"
              ? "Remises à corriger"
              : "Remises des étudiants"
          }
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <Card className="p-4 overflow-x-auto">
          {submissionsFiltrees.length === 0 ? (
            <p className="text-sm text-gray-400 p-2">
              {filtre === "a_corriger"
                ? "Aucune remise en attente de correction."
                : "Aucune remise pour le moment."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3 font-medium">Étudiant</th>
                  <th className="p-3 font-medium">TP</th>
                  <th className="p-3 font-medium">Fichier</th>
                  <th className="p-3 font-medium">Note</th>
                  <th className="p-3 font-medium">Commentaire</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {submissionsFiltrees.map((submission) => (
                  <tr key={submission.id} className="border-b last:border-0">
                    <td className="p-3">{submission.student_email}</td>

                    <td className="p-3">
                      {assignments[String(submission.assignment_id)] ??
                        `TP ${submission.assignment_id}`}
                    </td>

                    <td className="p-3">
                      <a
                        href={fichierUrl(submission.fichier)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:underline break-all"
                      >
                        {nomFichier(submission.fichier)}
                      </a>
                    </td>

                    <td className="p-3">{submission.note ?? "-"}</td>

                    <td className="p-3">{submission.commentaire ?? "-"}</td>

                    <td className="p-3 text-gray-500">
                      {new Date(submission.date_remise).toLocaleString("fr-CA")}
                    </td>

                    <td className="p-3">
                      <Link
                        href={`/instructor/assignments/${submission.id}`}
                        className="text-green-700 hover:underline"
                      >
                        Corriger
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function InstructorAssignmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Chargement...</div>}>
      <InstructorAssignmentsContent />
    </Suspense>
  );
}

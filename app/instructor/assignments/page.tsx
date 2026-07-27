"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function fichierUrl(chemin: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tp-submissions/${chemin}`;
}

function nomFichier(chemin: string) {
  const base = chemin.split("/").pop() ?? chemin;
  // enlève le préfixe timestamp "1784868804241-"
  return base.replace(/^\d+-/, "");
}

export default function InstructorAssignmentsPage() {
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

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow p-8">
        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Remises des étudiants
        </h1>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Étudiant</th>
              <th className="p-3 text-left">TP</th>
              <th className="p-3 text-left">Fichier</th>
              <th className="p-3 text-left">Note</th>
              <th className="p-3 text-left">Commentaire</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {submissions.map((submission) => (
              <tr
                key={submission.id}
                className="border-b"
              >
                <td className="p-3">
                  {submission.student_email}
                </td>

                <td className="p-3">
                  {assignments[String(submission.assignment_id)] ??
                    `TP ${submission.assignment_id}`}
                </td>

                <td className="p-3">
                  <a
                    href={fichierUrl(submission.fichier)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    📎 {nomFichier(submission.fichier)}
                  </a>
                </td>

                <td className="p-3">
                  {submission.note ?? "-"}
                </td>

                <td className="p-3">
                  {submission.commentaire ?? "-"}
                </td>

                <td className="p-3">
                  {new Date(
                    submission.date_remise
                  ).toLocaleString("fr-CA")}
                </td>

                <td className="p-3">
                  <Link
                    href={`/instructor/assignments/${submission.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Corriger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

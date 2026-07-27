"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function fichierUrl(chemin: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tp-submissions/${chemin}`;
}

function nomFichier(chemin: string) {
  const base = chemin.split("/").pop() ?? chemin;
  return base.replace(/^\d+-/, "");
}

export default function AssignmentCorrectionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [submission, setSubmission] = useState<any>(null);
  const [assignmentTitre, setAssignmentTitre] = useState<string>("");
  const [note, setNote] = useState("");
  const [commentaire, setCommentaire] = useState("");

  useEffect(() => {
    if (id) chargerRemise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chargerRemise() {
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) return;

    setSubmission(data);
    setNote(String(data.note ?? ""));
    setCommentaire(data.commentaire ?? "");

    const { data: tp } = await supabase
      .from("assignments")
      .select("titre")
      .eq("id", data.assignment_id)
      .maybeSingle();

    setAssignmentTitre(tp?.titre ?? `TP ${data.assignment_id}`);
  }

  async function enregistrerCorrection() {
    const { error } = await supabase
      .from("assignment_submissions")
      .update({
        note: Number(note),
        commentaire,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Correction enregistrée");
  }

  if (!submission) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Correction TP"
          backHref="/instructor/assignments"
          backLabel="← Remises des étudiants"
        />

        <Card>
          <div className="space-y-5">
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Étudiant : </span>
              {submission.student_email}
            </p>

            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">TP : </span>
              {assignmentTitre}
            </p>

            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Fichier : </span>
              <a
                href={fichierUrl(submission.fichier)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                📎 {nomFichier(submission.fichier)}
              </a>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <input
                type="number"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={5}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>

            <Button onClick={enregistrerCorrection}>Enregistrer</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

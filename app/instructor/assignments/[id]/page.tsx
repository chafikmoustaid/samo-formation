"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AssignmentCorrectionPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const [submission, setSubmission] =
    useState<any>(null);

  const [note, setNote] = useState("");

  const [commentaire, setCommentaire] =
    useState("");

  useEffect(() => {
    chargerRemise();
  }, []);

  async function chargerRemise() {
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!data) return;

    setSubmission(data);
    setNote(String(data.note ?? ""));
    setCommentaire(data.commentaire ?? "");
  }

  async function enregistrerCorrection() {
    const { error } = await supabase
      .from("assignment_submissions")
      .update({
        note: Number(note),
        commentaire,
      })
      .eq("id", params.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Correction enregistrée");
  }

  if (!submission) {
    return (
      <div className="p-8">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Correction TP
        </h1>

        <div className="space-y-4">

          <p>
            <strong>Étudiant :</strong>{" "}
            {submission.student_email}
          </p>

          <p>
            <strong>TP :</strong>{" "}
            {submission.assignment_id}
          </p>

          <p>
            <strong>Fichier :</strong>{" "}
            {submission.fichier}
          </p>

          <div>
            <label className="block mb-2">
              Note
            </label>

            <input
              type="number"
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label className="block mb-2">
              Commentaire
            </label>

            <textarea
              value={commentaire}
              onChange={(e) =>
                setCommentaire(
                  e.target.value
                )
              }
              rows={5}
              className="border rounded p-2 w-full"
            />
          </div>

          <button
            onClick={enregistrerCorrection}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
          >
            Enregistrer
          </button>

        </div>

      </div>

    </div>
  );
}
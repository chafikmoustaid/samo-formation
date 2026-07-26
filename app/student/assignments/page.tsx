"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<number, File>>({});

  useEffect(() => {
    chargerTP();
  }, []);

  async function chargerTP() {
    // On exclut volontairement corrige_html : c'est le corrigé du TP, il
    // ne doit jamais transiter vers le navigateur d'un compte étudiant.
    const { data } = await supabase
      .from("assignments")
      .select(
        "id, evaluation_id, titre, description, date_limite, created_at, contenu_html"
      )
      .order("date_limite");

    setAssignments(data ?? []);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: mesRemises } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", user.id)
      .order("date_remise", { ascending: false });

    setSubmissions(mesRemises ?? []);
  }

  function derniereRemise(assignmentId: number) {
    return submissions.find(
      (s) => s.assignment_id === assignmentId
    );
  }

  async function deposerTravail(
    assignmentId: number
  ) {
    const fichier = files[assignmentId];

    if (!fichier) {
      alert("Choisissez un fichier");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Utilisateur non connecté");
      return;
    }

    const chemin = `${user.id}/${Date.now()}-${fichier.name}`;

    const { error: uploadError } =
      await supabase.storage
        .from("tp-submissions")
        .upload(chemin, fichier);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    await supabase
      .from("assignment_submissions")
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        student_email: user.email,
        fichier: chemin,
      });

    alert("Travail remis avec succès");
    chargerTP();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Mes travaux pratiques
        </h1>

        <div className="space-y-6">

          {assignments.map((assignment) => {
            const remise = derniereRemise(assignment.id);

            return (
              <div
                key={assignment.id}
                className="border rounded-xl p-6"
              >
                <h2 className="text-2xl font-bold mb-3">
                  {assignment.titre}
                </h2>

                {assignment.contenu_html ? (
                  <div
                    className="mb-4 tp-content"
                    dangerouslySetInnerHTML={{
                      __html: assignment.contenu_html,
                    }}
                  />
                ) : (
                  <p className="mb-4">
                    {assignment.description}
                  </p>
                )}

                {assignment.date_limite && (
                  <p className="mb-4">
                    <strong>Date limite :</strong>{" "}
                    {assignment.date_limite}
                  </p>
                )}

                {remise ? (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      remise.note !== null && remise.note !== undefined
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                    }`}
                  >
                    <p>
                      ✅ Remis le{" "}
                      {new Date(remise.date_remise).toLocaleString(
                        "fr-CA"
                      )}
                    </p>

                    {remise.note !== null && remise.note !== undefined ? (
                      <p className="mt-1">
                        <strong>Note :</strong> {remise.note}/20
                        {remise.commentaire && (
                          <>
                            {" — "}
                            {remise.commentaire}
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1">⏳ En attente de correction</p>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-gray-500">
                    ⏳ Pas encore remis
                  </p>
                )}

                <input
                  type="file"
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (!file) return;

                    setFiles((prev) => ({
                      ...prev,
                      [assignment.id]: file,
                    }));
                  }}
                  className="mb-4"
                />

                <button
                  onClick={() =>
                    deposerTravail(
                      assignment.id
                    )
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  {remise ? "Remettre à nouveau" : "Envoyer"}
                </button>

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}

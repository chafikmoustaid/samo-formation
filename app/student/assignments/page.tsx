"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<number, File>>({});

  useEffect(() => {
    chargerTP();
  }, []);

  async function chargerTP() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let evaluationIds: number[] | null = null;

    if (user) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("formation_id")
        .eq("id", user.id)
        .single();

      if (profil?.formation_id) {
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("id")
          .eq("formation_id", profil.formation_id);

        const sessionIds = (sessionsData ?? []).map((s) => s.id);

        const { data: evaluationsData } = await supabase
          .from("evaluations")
          .select("id")
          .eq("type", "tp")
          .in("session_id", sessionIds.length > 0 ? sessionIds : [-1]);

        evaluationIds = (evaluationsData ?? []).map((e) => e.id);
      }
    }

    // On exclut volontairement corrige_html : c'est le corrigé du TP, il
    // ne doit jamais transiter vers le navigateur d'un compte étudiant.
    let assignmentsQuery = supabase
      .from("assignments")
      .select(
        "id, evaluation_id, titre, description, date_limite, created_at, contenu_html"
      )
      .order("date_limite");

    if (evaluationIds) {
      assignmentsQuery = assignmentsQuery.in(
        "evaluation_id",
        evaluationIds.length > 0 ? evaluationIds : [-1]
      );
    }

    const { data } = await assignmentsQuery;

    setAssignments(data ?? []);

    if (!user) return;

    const { data: mesRemises } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", user.id)
      .order("date_remise", { ascending: false });

    setSubmissions(mesRemises ?? []);
  }

  function derniereRemise(assignmentId: number) {
    return submissions.find((s) => s.assignment_id === assignmentId);
  }

  async function deposerTravail(assignmentId: number) {
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

    const { error: uploadError } = await supabase.storage
      .from("tp-submissions")
      .upload(chemin, fichier);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    await supabase.from("assignment_submissions").insert({
      assignment_id: assignmentId,
      student_id: user.id,
      student_email: user.email,
      fichier: chemin,
    });

    alert("Travail remis avec succès");
    chargerTP();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Mes travaux pratiques"
          backHref="/student"
          backLabel="← Portail étudiant"
        />

        <div className="space-y-4">
          {assignments.map((assignment) => {
            const remise = derniereRemise(assignment.id);

            return (
              <Card key={assignment.id}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {assignment.titre}
                </h2>

                {assignment.contenu_html ? (
                  <div
                    className="mb-4 tp-content text-sm text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: assignment.contenu_html,
                    }}
                  />
                ) : (
                  <p className="mb-4 text-sm text-gray-700">
                    {assignment.description}
                  </p>
                )}

                {assignment.date_limite && (
                  <p className="mb-4 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      Date limite :
                    </span>{" "}
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
                      Remis le{" "}
                      {new Date(remise.date_remise).toLocaleString("fr-CA")}
                    </p>

                    {remise.note !== null && remise.note !== undefined ? (
                      <p className="mt-1">
                        <strong>Note :</strong> {remise.note}/20
                        {remise.commentaire && <>{" — "}{remise.commentaire}</>}
                      </p>
                    ) : (
                      <p className="mt-1">En attente de correction</p>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-gray-500">
                    Pas encore remis
                  </p>
                )}

                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    setFiles((prev) => ({
                      ...prev,
                      [assignment.id]: file,
                    }));
                  }}
                  className="mb-4 text-sm"
                />

                <div>
                  <Button onClick={() => deposerTravail(assignment.id)}>
                    {remise ? "Remettre à nouveau" : "Envoyer"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

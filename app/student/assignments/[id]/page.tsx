"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [titreSeance, setTitreSeance] = useState("");
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (courseId) chargerTp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function chargerTp() {
    setLoading(true);

    // Le lien vient de /student/courses avec course.id — on le résout
    // vers le numéro de séance (courses.session_id), comme le fait déjà
    // /student/quiz/[id] pour rester cohérent.
    const { data: course } = await supabase
      .from("courses")
      .select("session_id, titre")
      .eq("id", Number(courseId))
      .single();

    if (!course) {
      setLoading(false);
      return;
    }

    setTitreSeance(course.titre);

    const { data: evaluation } = await supabase
      .from("evaluations")
      .select("*, assignments(id, evaluation_id, titre, description, date_limite, created_at, contenu_html)")
      .eq("session_id", course.session_id)
      .eq("type", "tp")
      .maybeSingle();

    const tp = evaluation?.assignments?.[0] ?? null;
    setAssignment(tp);

    if (tp) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: remise } = await supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", user.id)
          .eq("assignment_id", tp.id)
          .order("date_remise", { ascending: false })
          .limit(1)
          .maybeSingle();

        setSubmission(remise ?? null);
      }
    }

    setLoading(false);
  }

  async function deposerTravail() {
    if (!assignment) return;

    if (!file) {
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

    setEnvoi(true);

    const chemin = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("tp-submissions")
      .upload(chemin, file);

    if (uploadError) {
      alert(uploadError.message);
      setEnvoi(false);
      return;
    }

    await supabase.from("assignment_submissions").insert({
      assignment_id: assignment.id,
      student_id: user.id,
      student_email: user.email,
      fichier: chemin,
    });

    alert("Travail remis avec succès");
    setEnvoi(false);
    chargerTp();
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
          <Link
            href="/student/courses"
            className="text-sm text-gray-500 hover:underline"
          >
            ← Mes cours
          </Link>
          <p className="mt-4">
            Aucun TP publié pour {titreSeance || "cette séance"}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link
          href="/student/courses"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Mes cours
        </Link>

        <h1 className="text-3xl font-bold text-green-700 mt-4 mb-6">
          {assignment.titre}
        </h1>

        {assignment.contenu_html ? (
          <div
            className="mb-4 tp-content"
            dangerouslySetInnerHTML={{
              __html: assignment.contenu_html,
            }}
          />
        ) : (
          <p className="mb-4">{assignment.description}</p>
        )}

        {assignment.date_limite && (
          <p className="mb-4">
            <strong>Date limite :</strong> {assignment.date_limite}
          </p>
        )}

        {submission ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              submission.note !== null && submission.note !== undefined
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <p>
              ✅ Remis le{" "}
              {new Date(submission.date_remise).toLocaleString("fr-CA")}
            </p>

            {submission.note !== null && submission.note !== undefined ? (
              <p className="mt-1">
                <strong>Note :</strong> {submission.note}/20
                {submission.commentaire && (
                  <>{" — "}{submission.commentaire}</>
                )}
              </p>
            ) : (
              <p className="mt-1">⏳ En attente de correction</p>
            )}
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-500">⏳ Pas encore remis</p>
        )}

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-4"
        />

        <button
          onClick={deposerTravail}
          disabled={envoi}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
        >
          {envoi
            ? "Envoi..."
            : submission
            ? "Remettre à nouveau"
            : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

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

type Question = {
  id: number;
  ordre: number;
  enonce: string;
  reponse_attendue: string | null;
};

type Reponse = {
  id: number;
  question_id: number;
  reponse_texte: string | null;
  fichier: string | null;
  note: number | null;
  commentaire: string | null;
};

export default function AssignmentCorrectionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [submission, setSubmission] = useState<any>(null);
  const [assignmentTitre, setAssignmentTitre] = useState<string>("");
  const [note, setNote] = useState("");
  const [commentaire, setCommentaire] = useState("");

  // Mode « TP structuré »
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reponses, setReponses] = useState<Map<number, Reponse>>(new Map());
  const [notesQuestions, setNotesQuestions] = useState<Record<number, string>>({});
  const [commentairesQuestions, setCommentairesQuestions] = useState<
    Record<number, string>
  >({});
  const [enregistrement, setEnregistrement] = useState(false);

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
      .select("id, titre")
      .eq("id", data.assignment_id)
      .maybeSingle();

    setAssignmentTitre(tp?.titre ?? `TP ${data.assignment_id}`);

    if (tp) {
      // Accès direct à la table (pas la fonction assignment_questions_visibles)
      // car le formateur/admin doit voir la reponse_attendue pour comparer.
      const { data: questionsData } = await supabase
        .from("assignment_questions")
        .select("id, ordre, enonce, reponse_attendue")
        .eq("assignment_id", tp.id)
        .order("ordre");

      setQuestions((questionsData as Question[]) ?? []);

      const { data: reponsesData } = await supabase
        .from("assignment_answers")
        .select("*")
        .eq("submission_id", id);

      const map = new Map(
        ((reponsesData as Reponse[]) ?? []).map((r) => [r.question_id, r])
      );
      setReponses(map);

      const notesInit: Record<number, string> = {};
      const commentairesInit: Record<number, string> = {};
      map.forEach((r, qId) => {
        notesInit[qId] = r.note !== null ? String(r.note) : "";
        commentairesInit[qId] = r.commentaire ?? "";
      });
      setNotesQuestions(notesInit);
      setCommentairesQuestions(commentairesInit);
    }
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

  async function enregistrerCorrectionStructuree() {
    setEnregistrement(true);

    for (const q of questions) {
      const reponse = reponses.get(q.id);
      if (!reponse) continue;

      const noteTexte = notesQuestions[q.id];
      const { error } = await supabase
        .from("assignment_answers")
        .update({
          note: noteTexte?.trim() ? Number(noteTexte) : null,
          commentaire: commentairesQuestions[q.id]?.trim() || null,
        })
        .eq("id", reponse.id);

      if (error) {
        alert(`Erreur sur la question "${q.enonce}" : ${error.message}`);
      }
    }

    // Note globale = somme des notes par question (si toutes renseignées),
    // sinon laissée telle quelle pour saisie manuelle.
    const notesNumeriques = questions
      .map((q) => notesQuestions[q.id])
      .filter((n) => n?.trim())
      .map(Number);

    if (notesNumeriques.length === questions.length && questions.length > 0) {
      const total = notesNumeriques.reduce((a, b) => a + b, 0);
      await supabase
        .from("assignment_submissions")
        .update({ note: total })
        .eq("id", id);
      setNote(String(total));
    }

    setEnregistrement(false);
    alert("Correction enregistrée");
    chargerRemise();
  }

  if (!submission) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  const modeStructure = questions.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Correction TP"
          backHref="/instructor/assignments"
          backLabel="← Remises des étudiants"
        />

        <Card className="mb-6">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Étudiant : </span>
            {submission.student_email}
          </p>

          <p className="text-sm text-gray-700 mt-1">
            <span className="font-medium text-gray-900">TP : </span>
            {assignmentTitre}
          </p>

          {!modeStructure && submission.fichier && (
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium text-gray-900">Fichier : </span>
              <a
                href={fichierUrl(submission.fichier)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                {nomFichier(submission.fichier)}
              </a>
            </p>
          )}
        </Card>

        {modeStructure ? (
          <Card>
            <div className="space-y-6">
              {questions.map((q, index) => {
                const reponse = reponses.get(q.id);
                return (
                  <div
                    key={q.id}
                    className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
                  >
                    <h2 className="text-sm font-semibold text-gray-900 mb-2">
                      Question {index + 1}
                    </h2>
                    <p className="text-sm text-gray-700 mb-3">{q.enonce}</p>

                    <div className="grid sm:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Réponse de l&apos;étudiant
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[3rem]">
                          {reponse?.reponse_texte || (
                            <span className="text-gray-400">Aucune réponse texte</span>
                          )}
                        </div>
                        {reponse?.fichier && (
                          <a
                            href={fichierUrl(reponse.fichier)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-700 hover:underline text-xs mt-1 inline-block"
                          >
                            Voir la pièce jointe ({nomFichier(reponse.fichier)})
                          </a>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Réponse attendue (corrigé)
                        </p>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[3rem]">
                          {q.reponse_attendue || (
                            <span className="text-gray-400">Aucun corrigé renseigné</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="Note"
                        value={notesQuestions[q.id] ?? ""}
                        onChange={(e) =>
                          setNotesQuestions((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
                      />
                      <input
                        type="text"
                        placeholder="Commentaire (optionnel)"
                        value={commentairesQuestions[q.id] ?? ""}
                        onChange={(e) =>
                          setCommentairesQuestions((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1"
                      />
                    </div>
                  </div>
                );
              })}

              <Button onClick={enregistrerCorrectionStructuree} disabled={enregistrement}>
                {enregistrement ? "Enregistrement…" : "Enregistrer la correction"}
              </Button>

              <p className="text-xs text-gray-400">
                Note globale actuelle : {note || "—"}
                {questions.length > 0 &&
                  " (calculée automatiquement comme la somme des notes par question, une fois toutes renseignées)"}
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="space-y-5">
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
        )}
      </div>
    </div>
  );
}

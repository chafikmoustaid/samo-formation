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
  groupe: string | null;
  reponse_attendue: string | null;
};

type Reponse = {
  id: number;
  question_id: number;
  reponse_texte: string | null;
  fichier: string | null;
};

type RubricItem = {
  id: number;
  groupe: string | null;
  critere: string;
  points_max: number;
  ordre: number;
};

function grouperPar<T extends { groupe: string | null }>(items: T[]) {
  const groupes: { nom: string; items: T[] }[] = [];
  const index = new Map<string, T[]>();
  for (const item of items) {
    const nom = item.groupe ?? "Général";
    if (!index.has(nom)) {
      const liste: T[] = [];
      index.set(nom, liste);
      groupes.push({ nom, items: liste });
    }
    index.get(nom)!.push(item);
  }
  return groupes;
}

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
  const [rubrique, setRubrique] = useState<RubricItem[]>([]);
  const [pointsRubrique, setPointsRubrique] = useState<Record<number, string>>({});
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
      const [{ data: questionsData }, { data: rubriqueData }, { data: reponsesData }, { data: scoresData }] =
        await Promise.all([
          supabase
            .from("assignment_questions")
            .select("id, ordre, enonce, groupe, reponse_attendue")
            .eq("assignment_id", tp.id)
            .order("ordre"),
          supabase
            .from("assignment_rubric_items")
            .select("id, groupe, critere, points_max, ordre")
            .eq("assignment_id", tp.id)
            .order("ordre"),
          supabase.from("assignment_answers").select("*").eq("submission_id", id),
          supabase
            .from("assignment_rubric_scores")
            .select("rubric_item_id, points_obtenus")
            .eq("submission_id", id),
        ]);

      setQuestions((questionsData as Question[]) ?? []);
      setRubrique((rubriqueData as RubricItem[]) ?? []);

      setReponses(
        new Map(((reponsesData as Reponse[]) ?? []).map((r) => [r.question_id, r]))
      );

      const pointsInit: Record<number, string> = {};
      ((scoresData as { rubric_item_id: number; points_obtenus: number | null }[]) ?? []).forEach(
        (s) => {
          pointsInit[s.rubric_item_id] = s.points_obtenus !== null ? String(s.points_obtenus) : "";
        }
      );
      setPointsRubrique(pointsInit);
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

    for (const r of rubrique) {
      const valeur = pointsRubrique[r.id];
      const points = valeur?.trim() ? Number(valeur) : null;

      const { error } = await supabase
        .from("assignment_rubric_scores")
        .upsert(
          { submission_id: Number(id), rubric_item_id: r.id, points_obtenus: points },
          { onConflict: "submission_id,rubric_item_id" }
        );

      if (error) {
        alert(`Erreur sur le critère "${r.critere}" : ${error.message}`);
      }
    }

    const pointsRenseignes = rubrique
      .map((r) => pointsRubrique[r.id])
      .filter((v) => v?.trim())
      .map(Number);

    let nouvelleNote = note;
    if (pointsRenseignes.length === rubrique.length && rubrique.length > 0) {
      const total = pointsRenseignes.reduce((a, b) => a + b, 0);
      await supabase.from("assignment_submissions").update({ note: total }).eq("id", id);
      nouvelleNote = String(total);
    }

    if (commentaire !== (submission?.commentaire ?? "")) {
      await supabase.from("assignment_submissions").update({ commentaire }).eq("id", id);
    }

    setNote(nouvelleNote);
    setEnregistrement(false);
    alert("Correction enregistrée");
    chargerRemise();
  }

  if (!submission) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  const modeStructure = questions.length > 0;
  const groupesQuestions = grouperPar(questions);
  const rubriqueParGroupe = new Map(grouperPar(rubrique).map((g) => [g.nom, g.items]));
  const pointsMaxTotal = rubrique.reduce((a, r) => a + Number(r.points_max), 0);

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
            <div className="space-y-8">
              {groupesQuestions.map((groupe) => (
                <div key={groupe.nom}>
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">
                    {groupe.nom}
                  </h2>

                  <div className="space-y-5 mb-4">
                    {groupe.items.map((q) => {
                      const reponse = reponses.get(q.id);
                      return (
                        <div key={q.id} className="border-b border-gray-100 pb-5 last:border-0">
                          <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{q.enonce}</p>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Réponse de l&apos;étudiant
                              </p>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[2.5rem]">
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

                            {q.reponse_attendue ? (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Réponse attendue (corrigé)
                                </p>
                                <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[2.5rem]">
                                  {q.reponse_attendue}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Réponse attendue
                                </p>
                                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 text-xs text-gray-400 min-h-[2.5rem] flex items-center">
                                  Question d&apos;observation — pas de corrigé unique,
                                  évaluer selon la grille ci-dessous.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(rubriqueParGroupe.get(groupe.nom)?.length ?? 0) > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                      <p className="text-xs font-semibold text-amber-900 mb-3">
                        Grille d&apos;évaluation
                      </p>
                      <div className="space-y-2">
                        {rubriqueParGroupe.get(groupe.nom)!.map((r) => (
                          <div key={r.id} className="flex items-center gap-3 text-sm">
                            <span className="flex-1 text-gray-700">{r.critere}</span>
                            <input
                              type="number"
                              min={0}
                              max={r.points_max}
                              value={pointsRubrique[r.id] ?? ""}
                              onChange={(e) =>
                                setPointsRubrique((prev) => ({
                                  ...prev,
                                  [r.id]: e.target.value,
                                }))
                              }
                              className="border border-amber-200 rounded-lg px-2 py-1 text-sm w-16 text-center bg-white"
                            />
                            <span className="text-gray-500 text-xs w-14">
                              / {r.points_max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire global
                </label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
                />
              </div>

              <Button onClick={enregistrerCorrectionStructuree} disabled={enregistrement}>
                {enregistrement ? "Enregistrement…" : "Enregistrer la correction"}
              </Button>

              <p className="text-xs text-gray-400">
                Note globale actuelle : {note || "—"}
                {pointsMaxTotal > 0 && ` / ${pointsMaxTotal}`}
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

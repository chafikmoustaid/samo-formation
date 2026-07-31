"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SeanceNav from "@/components/student/SeanceNav";
import { ACCEPT_TP_INPUT, extensionAutorisee } from "@/lib/fichiersTp";

type Question = { id: number; ordre: number; enonce: string; groupe: string | null };
type ReponseExistante = {
  question_id: number;
  reponse_texte: string | null;
  fichier: string | null;
  note: number | null;
  commentaire: string | null;
};
type RubricItem = {
  id: number;
  groupe: string | null;
  critere: string;
  points_max: number;
  ordre: number;
};
type RubricScore = { rubric_item_id: number; points_obtenus: number | null };

function fichierUrl(chemin: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tp-submissions/${chemin}`;
}

// Regroupe une liste par sa propriété `groupe` (ou "Général" si absente),
// en conservant l'ordre d'apparition des groupes et des items.
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

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [titreSeance, setTitreSeance] = useState("");
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  // Mode « TP structuré » : questions remplissables en ligne, comme un quiz,
  // avec pièce jointe optionnelle par question, groupées par section (le TP
  // peut contenir plusieurs sous-TP, ex. "TP 1", "TP 2"), et une grille
  // d'évaluation affichée à titre informatif pour chaque section.
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rubrique, setRubrique] = useState<RubricItem[]>([]);
  const [scoresRubrique, setScoresRubrique] = useState<Map<number, number | null>>(
    new Map()
  );
  const [reponsesExistantes, setReponsesExistantes] = useState<
    Map<number, ReponseExistante>
  >(new Map());
  const [reponsesTexte, setReponsesTexte] = useState<Record<number, string>>({});
  const [fichiersParQuestion, setFichiersParQuestion] = useState<
    Record<number, File | null>
  >({});

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
      const [{ data: questionsData }, { data: rubriqueData }] = await Promise.all([
        supabase.rpc("assignment_questions_visibles", { p_assignment_id: tp.id }),
        supabase
          .from("assignment_rubric_items")
          .select("id, groupe, critere, points_max, ordre")
          .eq("assignment_id", tp.id)
          .order("ordre"),
      ]);

      setQuestions((questionsData as Question[]) ?? []);
      setRubrique((rubriqueData as RubricItem[]) ?? []);

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

        if (remise) {
          const [{ data: reponses }, { data: scores }] = await Promise.all([
            supabase
              .from("assignment_answers")
              .select("question_id, reponse_texte, fichier, note, commentaire")
              .eq("submission_id", remise.id),
            supabase
              .from("assignment_rubric_scores")
              .select("rubric_item_id, points_obtenus")
              .eq("submission_id", remise.id),
          ]);

          setReponsesExistantes(
            new Map(
              ((reponses as ReponseExistante[]) ?? []).map((r) => [
                r.question_id,
                r,
              ])
            )
          );
          setScoresRubrique(
            new Map(
              ((scores as RubricScore[]) ?? []).map((s) => [
                s.rubric_item_id,
                s.points_obtenus,
              ])
            )
          );
        } else {
          setReponsesExistantes(new Map());
          setScoresRubrique(new Map());
        }
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

    if (!extensionAutorisee(file.name)) {
      alert("Ce type de fichier n'est pas accepté.");
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

  async function soumettreTpStructure() {
    if (!assignment) return;

    const manquantes = questions.filter(
      (q) => !reponsesTexte[q.id]?.trim() && !fichiersParQuestion[q.id]
    );
    if (manquantes.length > 0) {
      const confirmation = window.confirm(
        `${manquantes.length} question(s) sans réponse ni pièce jointe. Soumettre quand même ?`
      );
      if (!confirmation) return;
    }

    for (const q of questions) {
      const f = fichiersParQuestion[q.id];
      if (f && !extensionAutorisee(f.name)) {
        alert(`Le fichier joint à la question "${q.enonce}" n'a pas une extension acceptée.`);
        return;
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Utilisateur non connecté");
      return;
    }

    setEnvoi(true);

    const { data: nouvelleSoumission, error: erreurSoumission } = await supabase
      .from("assignment_submissions")
      .insert({
        assignment_id: assignment.id,
        student_id: user.id,
        student_email: user.email,
      })
      .select()
      .single();

    if (erreurSoumission || !nouvelleSoumission) {
      alert(erreurSoumission?.message ?? "Erreur lors de la remise.");
      setEnvoi(false);
      return;
    }

    for (const q of questions) {
      let cheminFichier: string | null = null;
      const f = fichiersParQuestion[q.id];

      if (f) {
        const chemin = `${user.id}/${nouvelleSoumission.id}/${q.id}-${Date.now()}-${f.name}`;
        const { error: uploadError } = await supabase.storage
          .from("tp-submissions")
          .upload(chemin, f);

        if (uploadError) {
          alert(
            `Erreur lors de l'envoi de la pièce jointe pour "${q.enonce}" : ${uploadError.message}`
          );
          continue;
        }
        cheminFichier = chemin;
      }

      await supabase.from("assignment_answers").insert({
        submission_id: nouvelleSoumission.id,
        question_id: q.id,
        reponse_texte: reponsesTexte[q.id]?.trim() || null,
        fichier: cheminFichier,
      });
    }

    alert("TP remis avec succès");
    setEnvoi(false);
    setReponsesTexte({});
    setFichiersParQuestion({});
    chargerTp();
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <SeanceNav courseId={courseId} current="tp" />
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {titreSeance || "TP"}
          </h1>
          <Card>Aucun TP publié pour {titreSeance || "cette séance"}.</Card>
        </div>
      </div>
    );
  }

  const modeStructure = questions.length > 0;
  const groupesQuestions = grouperPar(questions);
  const rubriqueParGroupe = new Map(
    grouperPar(rubrique).map((g) => [g.nom, g.items])
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <SeanceNav courseId={courseId} current="tp" />
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {assignment.titre}
        </h1>

        <Card>
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

          {submission ? (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                submission.note !== null && submission.note !== undefined
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              <p>
                Remis le{" "}
                {new Date(submission.date_remise).toLocaleString("fr-CA")}
              </p>

              {submission.note !== null && submission.note !== undefined ? (
                <p className="mt-1">
                  <strong>Note :</strong> {submission.note}
                  {submission.commentaire && (
                    <>{" — "}{submission.commentaire}</>
                  )}
                </p>
              ) : (
                <p className="mt-1">En attente de correction</p>
              )}
            </div>
          ) : (
            <p className="mb-6 text-sm text-gray-500">Pas encore remis</p>
          )}

          {modeStructure && (
            <>
              <h2 className="text-base font-bold text-gray-900 mb-4 pt-2 border-t border-gray-200">
                Réponds ci-dessous
              </h2>

              <div className="space-y-8">
                {groupesQuestions.map((groupe) => (
                  <div key={groupe.nom}>
                    <h3 className="text-sm font-semibold text-green-800 mb-4">
                      {groupe.nom}
                    </h3>

                    <div className="space-y-6">
                      {groupe.items.map((q) => {
                        const reponsePrecedente = reponsesExistantes.get(q.id);
                        return (
                          <div
                            key={q.id}
                            className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
                          >
                            <p className="text-sm text-gray-700 mb-3">{q.enonce}</p>

                            {reponsePrecedente ? (
                              <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="whitespace-pre-wrap text-gray-800">
                                  {reponsePrecedente.reponse_texte ||
                                    "(aucune réponse texte)"}
                                </p>
                                {reponsePrecedente.fichier && (
                                  <a
                                    href={fichierUrl(reponsePrecedente.fichier)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-700 hover:underline text-xs mt-2 inline-block"
                                  >
                                    Voir la pièce jointe
                                  </a>
                                )}
                              </div>
                            ) : (
                              <>
                                <textarea
                                  value={reponsesTexte[q.id] ?? ""}
                                  onChange={(e) =>
                                    setReponsesTexte((prev) => ({
                                      ...prev,
                                      [q.id]: e.target.value,
                                    }))
                                  }
                                  rows={3}
                                  placeholder="Ta réponse…"
                                  className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-2"
                                />
                                <input
                                  type="file"
                                  accept={ACCEPT_TP_INPUT}
                                  onChange={(e) =>
                                    setFichiersParQuestion((prev) => ({
                                      ...prev,
                                      [q.id]: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                  className="text-xs text-gray-500"
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {(rubriqueParGroupe.get(groupe.nom)?.length ?? 0) > 0 && (
                      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">
                        <p className="font-semibold mb-1">Tu seras évalué(e) sur :</p>
                        <ul className="space-y-0.5">
                          {rubriqueParGroupe.get(groupe.nom)!.map((r) => {
                            const obtenu = scoresRubrique.get(r.id);
                            return (
                              <li key={r.id} className="flex justify-between gap-3">
                                <span>{r.critere}</span>
                                <span className="shrink-0">
                                  {submission && obtenu !== undefined
                                    ? `${obtenu ?? "—"} / ${r.points_max}`
                                    : `/ ${r.points_max}`}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {!submission && (
                  <Button onClick={soumettreTpStructure} disabled={envoi}>
                    {envoi ? "Envoi..." : "Soumettre le TP"}
                  </Button>
                )}
              </div>
            </>
          )}

          {!modeStructure && (
            <>
              <input
                type="file"
                accept={ACCEPT_TP_INPUT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mb-4 text-sm"
              />

              <div>
                <Button onClick={deposerTravail} disabled={envoi}>
                  {envoi ? "Envoi..." : submission ? "Remettre à nouveau" : "Envoyer"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

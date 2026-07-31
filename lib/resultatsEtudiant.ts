import { supabase } from "@/lib/supabase";

// Les tables assignment_submissions -> assignments -> evaluations -> sessions
// n'ont pas toutes de contrainte de clé étrangère déclarée en base (seules
// assignments.evaluation_id, exam_results.evaluation_id et
// quiz_results.session_id en ont une). PostgREST ne peut donc pas faire
// l'embedding automatique (assignments(evaluations(sessions(...)))) sur les
// autres relations : on va chercher chaque table séparément puis on
// recompose les liens ici, comme le fait déjà SeanceNav.tsx ailleurs dans
// l'app.

export type ResultatQuiz = {
  id: number;
  score: number;
  pourcentage: number;
  date: string;
  numeroSeance: number | null;
};

export type ResultatTp = {
  id: number;
  titre: string;
  note: number | null;
  date: string | null;
  numeroSeance: number | null;
};

export type ResultatExamen = {
  id: number;
  score: number;
  pourcentage: number;
  date: string;
  numeroSeance: number | null;
};

export async function chargerResultatsEtudiant(studentId: string) {
  const [{ data: quizData }, { data: submissionsData }, { data: examData }] =
    await Promise.all([
      supabase
        .from("quiz_results")
        .select("id, score, pourcentage, date_passage, session_id")
        .eq("user_id", studentId)
        .order("date_passage", { ascending: true }),
      supabase
        .from("assignment_submissions")
        .select("id, note, date_remise, assignment_id")
        .eq("student_id", studentId)
        .order("date_remise", { ascending: true }),
      supabase
        .from("exam_results")
        .select("id, score, pourcentage, date_passage, evaluation_id")
        .eq("user_id", studentId)
        .order("date_passage", { ascending: true }),
    ]);

  const quizRows = quizData ?? [];
  const submissionRows = submissionsData ?? [];
  const examRows = examData ?? [];

  // TP : assignment_id -> assignments (titre, evaluation_id) -> evaluations (session_id)
  const assignmentIds = [...new Set(submissionRows.map((s) => s.assignment_id))];
  const { data: assignmentsData } =
    assignmentIds.length > 0
      ? await supabase
          .from("assignments")
          .select("id, titre, evaluation_id")
          .in("id", assignmentIds)
      : { data: [] as any[] };

  const assignmentsParId = new Map(
    (assignmentsData ?? []).map((a) => [a.id, a])
  );

  // Sessions à résoudre : celles des quiz + celles des évaluations (TP et examens)
  const evaluationIds = [
    ...new Set(
      [
        ...(assignmentsData ?? []).map((a) => a.evaluation_id),
        ...examRows.map((e) => e.evaluation_id),
      ].filter((id) => id !== null && id !== undefined)
    ),
  ];

  const { data: evaluationsData } =
    evaluationIds.length > 0
      ? await supabase
          .from("evaluations")
          .select("id, session_id")
          .in("id", evaluationIds)
      : { data: [] as any[] };

  const evaluationsParId = new Map(
    (evaluationsData ?? []).map((e) => [e.id, e])
  );

  const sessionIds = [
    ...new Set(
      [
        ...quizRows.map((q) => q.session_id),
        ...(evaluationsData ?? []).map((e) => e.session_id),
      ].filter((id) => id !== null && id !== undefined)
    ),
  ];

  const { data: sessionsData } =
    sessionIds.length > 0
      ? await supabase.from("sessions").select("id, numero").in("id", sessionIds)
      : { data: [] as any[] };

  const numeroParSessionId = new Map(
    (sessionsData ?? []).map((s) => [s.id, s.numero])
  );

  const quiz: ResultatQuiz[] = quizRows.map((q) => ({
    id: q.id,
    score: q.score,
    pourcentage: q.pourcentage,
    date: q.date_passage,
    numeroSeance: numeroParSessionId.get(q.session_id) ?? null,
  }));

  const tps: ResultatTp[] = submissionRows.map((s) => {
    const assignment = assignmentsParId.get(s.assignment_id);
    const evaluation = assignment
      ? evaluationsParId.get(assignment.evaluation_id)
      : null;
    return {
      id: s.id,
      titre: assignment?.titre ?? "TP",
      note: s.note,
      date: s.date_remise,
      numeroSeance: evaluation ? numeroParSessionId.get(evaluation.session_id) ?? null : null,
    };
  });

  const examens: ResultatExamen[] = examRows.map((e) => {
    const evaluation = evaluationsParId.get(e.evaluation_id);
    return {
      id: e.id,
      score: e.score,
      pourcentage: e.pourcentage,
      date: e.date_passage,
      numeroSeance: evaluation
        ? numeroParSessionId.get(evaluation.session_id) ?? null
        : null,
    };
  });

  return { quiz, tps, examens };
}

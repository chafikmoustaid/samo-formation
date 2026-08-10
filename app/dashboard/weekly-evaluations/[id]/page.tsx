"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type Evaluation = {
  id: number;
  instructor_id: string;
  student_id: string;
  matiere_id: number | null;
  formation_id: number | null;
  date_evaluation: string;
  seance: string | null;
  absences: string | null;
  retards: string | null;
  bonne_attitude: string | null;
  situation_difficile: string | null;
  remarques_materiel: string | null;
  difficultes_academiques: string | null;
  bareme_performance: string | null;
  rythme_echeancier: string | null;
  discuter_direction: boolean | null;
  statut: "brouillon" | "soumise";
};

const LABELS_BAREME: Record<string, string> = {
  moins_75: "Moins de 75 %",
  entre_75_80: "Entre 75 % et 80 %",
  entre_80_85: "Entre 80 % et 85 %",
  plus_85: "Plus de 85 %",
};

export default function AdminEvaluationHebdomadaireDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [nomFormateur, setNomFormateur] = useState("");
  const [nomFormation, setNomFormation] = useState("");
  const [nomMatiere, setNomMatiere] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (id) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function charger() {
    setChargement(true);

    const { data } = await supabase
      .from("weekly_evaluations")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (data) {
      setEvaluation(data as Evaluation);

      const [{ data: etudiant }, { data: formateur }, formationRes, matiereRes] = await Promise.all([
        supabase.from("profiles").select("nom_complet, email").eq("id", data.student_id).single(),
        supabase.from("profiles").select("nom_complet, email").eq("id", data.instructor_id).single(),
        data.formation_id
          ? supabase.from("formations").select("nom").eq("id", data.formation_id).single()
          : Promise.resolve({ data: null }),
        data.matiere_id
          ? supabase.from("matieres").select("nom").eq("id", data.matiere_id).single()
          : Promise.resolve({ data: null }),
      ]);

      setNomEtudiant(etudiant?.nom_complet ?? etudiant?.email ?? "Étudiant");
      setNomFormateur(formateur?.nom_complet ?? formateur?.email ?? "Formateur");
      setNomFormation((formationRes as { data: { nom: string } | null }).data?.nom ?? "");
      setNomMatiere((matiereRes as { data: { nom: string } | null }).data?.nom ?? "—");
    }

    setChargement(false);
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Évaluation introuvable"
            backHref="/dashboard/weekly-evaluations"
            backLabel="← Retour aux évaluations hebdomadaires"
          />
        </div>
      </div>
    );
  }

  function champ(label: string, valeur: string | null) {
    return (
      <div>
        <p className="font-semibold text-gray-500 text-sm mb-1">{label}</p>
        <p className="whitespace-pre-wrap text-gray-900">{valeur || "—"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title={`Évaluation hebdomadaire — ${nomEtudiant}`}
          subtitle={`${nomMatiere} — formateur : ${nomFormateur}${nomFormation ? ` — ${nomFormation}` : ""}`}
          backHref="/dashboard/weekly-evaluations"
          backLabel="← Retour aux évaluations hebdomadaires"
        />

        <div className="mb-5 text-sm rounded-lg px-4 py-3 border-2 bg-gray-50 border-gray-200 text-gray-600">
          Lecture seule — soumise par le formateur, non modifiable par l&apos;administration.
        </div>

        <Card>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5 text-sm">
              <div>
                <p className="font-semibold text-gray-500">Date</p>
                <p>{evaluation.date_evaluation}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Séance</p>
                <p>{evaluation.seance || "—"}</p>
              </div>
            </div>

            {champ("Absences", evaluation.absences)}
            {champ("Retards / départs anticipés", evaluation.retards)}
            {champ("Bonne attitude face à la formation", evaluation.bonne_attitude)}
            {champ("Situation difficile personnelle / santé", evaluation.situation_difficile)}
            {champ("Remarques sur le matériel scolaire", evaluation.remarques_materiel)}
            {champ("Difficultés académiques ou d'organisation", evaluation.difficultes_academiques)}
            {champ(
              "Barème de performance",
              evaluation.bareme_performance ? LABELS_BAREME[evaluation.bareme_performance] : null
            )}
            {champ("Rythme suit l'échéancier", evaluation.rythme_echeancier)}

            <div>
              <p className="font-semibold text-gray-500 text-sm mb-1">
                Discuter d&apos;une situation particulière avec la direction
              </p>
              <p className="text-gray-900">
                {evaluation.discuter_direction === null
                  ? "—"
                  : evaluation.discuter_direction
                  ? "Oui"
                  : "Non"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

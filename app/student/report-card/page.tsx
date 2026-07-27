"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function ReportCardPage() {
  const [loading, setLoading] = useState(true);
  const [moyenneQuiz, setMoyenneQuiz] = useState(0);
  const [moyenneTP, setMoyenneTP] = useState(0);

  useEffect(() => {
    chargerBulletin();
  }, []);

  async function chargerBulletin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: quizs } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("user_id", user.id);

    const { data: tps } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", user.id);

    const moyenneQuizCalc =
      quizs && quizs.length > 0
        ? quizs.reduce((sum, q) => sum + Number(q.pourcentage), 0) /
          quizs.length
        : 0;

    const moyenneTPCalc =
      tps && tps.length > 0
        ? tps.reduce(
            (sum, tp) => sum + (Number(tp.note ?? 0) / 20) * 100,
            0
          ) / tps.length
        : 0;

    setMoyenneQuiz(moyenneQuizCalc);
    setMoyenneTP(moyenneTPCalc);
    setLoading(false);
  }

  const examenFinal = 0;

  const resultatFinal =
    moyenneQuiz * 0.3 + moyenneTP * 0.3 + examenFinal * 0.4;

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader title="Bulletin SAMO" backHref="/student" backLabel="← Portail étudiant" />

        <Card>
          <div className="space-y-3 text-base text-gray-800">
            <p>
              Quiz : <strong>{moyenneQuiz.toFixed(2)} %</strong>
            </p>

            <p>
              TP : <strong>{moyenneTP.toFixed(2)} %</strong>
            </p>

            <p>
              Examen final : <strong>0.00 %</strong>
            </p>

            <hr className="border-gray-100" />

            <p className="text-xl font-bold text-gray-900">
              Résultat final : {resultatFinal.toFixed(2)} %
            </p>

            <p>
              Statut : {resultatFinal >= 60 ? "Réussi" : "Échec"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
        ? quizs.reduce(
            (sum, q) => sum + Number(q.pourcentage),
            0
          ) / quizs.length
        : 0;

    const moyenneTPCalc =
  tps && tps.length > 0
    ? (
        tps.reduce(
          (sum, tp) =>
            sum + (Number(tp.note ?? 0) / 20) * 100,
          0
        ) / tps.length
      )
    : 0;

    setMoyenneQuiz(moyenneQuizCalc);
    setMoyenneTP(moyenneTPCalc);
    setLoading(false);
  }

  const examenFinal = 0;

  const resultatFinal =
    moyenneQuiz * 0.3 +
    moyenneTP * 0.3 +
    examenFinal * 0.4;

  if (loading) {
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
          Bulletin SAMO
        </h1>

        <div className="space-y-4 text-xl">

          <p>
            Quiz : <strong>{moyenneQuiz.toFixed(2)} %</strong>
          </p>

          <p>
            TP : <strong>{moyenneTP.toFixed(2)} %</strong>
          </p>

          <p>
            Examen final : <strong>0.00 %</strong>
          </p>

          <hr />

          <p className="text-2xl font-bold">
            Résultat final : {resultatFinal.toFixed(2)} %
          </p>

          <p>
            Statut :{" "}
            {resultatFinal >= 60
              ? "✅ Réussi"
              : "❌ Échec"}
          </p>

        </div>

      </div>
    </div>
  );
}
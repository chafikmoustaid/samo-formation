"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentProgressPage() {
  const [loading, setLoading] = useState(true);

  const [quizCount, setQuizCount] = useState(0);
  const [tpCount, setTpCount] = useState(0);

  const totalSeances = 15;

  useEffect(() => {
    chargerProgression();
  }, []);

  async function chargerProgression() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: quizs } = await supabase
      .from("quiz_results")
      .select("session_id")
      .eq("user_id", user.id);

    const { data: tps } = await supabase
      .from("assignment_submissions")
      .select("id")
      .eq("student_id", user.id);

    setQuizCount(quizs?.length ?? 0);
    setTpCount(tps?.length ?? 0);

    setLoading(false);
  }

  const progressionQuiz =
    (quizCount / totalSeances) * 100;

  const progressionTP =
    (tpCount / totalSeances) * 100;

  const progressionGlobale =
    (progressionQuiz + progressionTP) / 2;

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
          Ma progression
        </h1>

        <div className="space-y-6">

          <div>
            <p>
              Quiz complétés : {quizCount}/{totalSeances}
            </p>

            <div className="bg-gray-200 h-4 rounded mt-2">
              <div
                className="bg-blue-600 h-4 rounded"
                style={{
                  width: `${progressionQuiz}%`,
                }}
              />
            </div>
          </div>

          <div>
            <p>
              TP remis : {tpCount}/{totalSeances}
            </p>

            <div className="bg-gray-200 h-4 rounded mt-2">
              <div
                className="bg-green-600 h-4 rounded"
                style={{
                  width: `${progressionTP}%`,
                }}
              />
            </div>
          </div>

          <div>
            <p>
              Progression globale :
              {" "}
              {progressionGlobale.toFixed(0)} %
            </p>

            <div className="bg-gray-200 h-4 rounded mt-2">
              <div
                className="bg-purple-600 h-4 rounded"
                style={{
                  width: `${progressionGlobale}%`,
                }}
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
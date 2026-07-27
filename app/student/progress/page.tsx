"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

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

  const progressionQuiz = (quizCount / totalSeances) * 100;
  const progressionTP = (tpCount / totalSeances) * 100;
  const progressionGlobale = (progressionQuiz + progressionTP) / 2;

  if (loading) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Ma progression" backHref="/student" backLabel="← Portail étudiant" />

        <Card className="space-y-6">
          <div>
            <p className="text-sm text-gray-700">
              Quiz complétés : {quizCount}/{totalSeances}
            </p>

            <div className="bg-gray-100 h-3 rounded-full mt-2">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{ width: `${progressionQuiz}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-700">
              TP remis : {tpCount}/{totalSeances}
            </p>

            <div className="bg-gray-100 h-3 rounded-full mt-2">
              <div
                className="bg-green-700 h-3 rounded-full"
                style={{ width: `${progressionTP}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-700">
              Progression globale : {progressionGlobale.toFixed(0)} %
            </p>

            <div className="bg-gray-100 h-3 rounded-full mt-2">
              <div
                className="bg-purple-600 h-3 rounded-full"
                style={{ width: `${progressionGlobale}%` }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

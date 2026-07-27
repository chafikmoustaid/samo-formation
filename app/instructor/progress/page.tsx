"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function InstructorProgressPage() {
  const [rows, setRows] = useState<any[]>([]);
  const totalSeances = 15;

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    const { data: students } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student");

    const { data: quizs } = await supabase.from("quiz_results").select("*");

    const { data: tps } = await supabase
      .from("assignment_submissions")
      .select("*");

    const resultat =
      students?.map((student) => {
        const quizCount =
          quizs?.filter((q) => q.user_id === student.id).length ?? 0;

        const tpCount =
          tps?.filter((tp) => tp.student_id === student.id).length ?? 0;

        const progressionQuiz = (quizCount / totalSeances) * 100;
        const progressionTP = (tpCount / totalSeances) * 100;

        const progression = ((progressionQuiz + progressionTP) / 2).toFixed(0);

        return {
          email: student.email,
          quizCount,
          tpCount,
          progression,
        };
      }) ?? [];

    setRows(resultat);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Progression des étudiants"
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3 font-medium">Étudiant</th>
                <th className="p-3 font-medium">Quiz</th>
                <th className="p-3 font-medium">TP</th>
                <th className="p-3 font-medium">Progression</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{row.quizCount}/15</td>
                  <td className="p-3">{row.tpCount}/15</td>
                  <td className="p-3">{row.progression} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

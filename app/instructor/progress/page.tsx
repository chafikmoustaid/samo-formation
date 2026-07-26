"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

    const { data: quizs } = await supabase
      .from("quiz_results")
      .select("*");

    const { data: tps } = await supabase
      .from("assignment_submissions")
      .select("*");

    const resultat =
      students?.map((student) => {
        const quizCount =
          quizs?.filter(
            (q) => q.user_id === student.id
          ).length ?? 0;

        const tpCount =
          tps?.filter(
            (tp) => tp.student_id === student.id
          ).length ?? 0;

        const progressionQuiz =
          (quizCount / totalSeances) * 100;

        const progressionTP =
          (tpCount / totalSeances) * 100;

        const progression =
          (
            (progressionQuiz +
              progressionTP) /
            2
          ).toFixed(0);

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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Progression des étudiants
        </h1>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">
                Étudiant
              </th>

              <th className="p-3 text-left">
                Quiz
              </th>

              <th className="p-3 text-left">
                TP
              </th>

              <th className="p-3 text-left">
                Progression
              </th>
            </tr>
          </thead>

          <tbody>

            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b"
              >
                <td className="p-3">
                  {row.email}
                </td>

                <td className="p-3">
                  {row.quizCount}/15
                </td>

                <td className="p-3">
                  {row.tpCount}/15
                </td>

                <td className="p-3">
                  {row.progression} %
                </td>
              </tr>
            ))}

          </tbody>
        </table>

      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  totalHeures: number;
  presences: number;
  quizRestants: number;
  examens: number;
};

export default function StudentPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [attendanceRes, sessionsRes, quizRes, examRes] =
        await Promise.all([
          supabase
            .from("attendance")
            .select("total_heures")
            .eq("user_id", user.id),
          supabase.from("sessions").select("id").eq("actif", true),
          supabase
            .from("quiz_results")
            .select("session_id")
            .eq("user_id", user.id),
          supabase.from("exam_results").select("id").eq("user_id", user.id),
        ]);

      if (!active) return;

      const totalHeures = (attendanceRes.data ?? []).reduce(
        (sum, fiche) => sum + Number(fiche.total_heures || 0),
        0
      );

      const presences = attendanceRes.data?.length ?? 0;

      const totalSessions = sessionsRes.data?.length ?? 0;
      const quizFaits = new Set(
        (quizRes.data ?? []).map((q) => q.session_id)
      ).size;
      const quizRestants = Math.max(totalSessions - quizFaits, 0);

      const examens = examRes.data?.length ?? 0;

      setStats({ totalHeures, presences, quizRestants, examens });
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Portail Étudiant
        </h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">
              Mes heures
            </div>

            <div className="text-4xl font-bold mt-2">
              {stats ? stats.totalHeures : "…"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">
              Mes présences
            </div>

            <div className="text-4xl font-bold mt-2">
              {stats ? stats.presences : "…"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">
              Quiz à faire
            </div>

            <div className="text-4xl font-bold mt-2">
              {stats ? stats.quizRestants : "…"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">
              Examens
            </div>

            <div className="text-4xl font-bold mt-2">
              {stats ? stats.examens : "…"}
            </div>
          </div>

        </div>

        <div className="mt-10 bg-white rounded-xl shadow p-6">

          <h2 className="text-2xl font-bold mb-6">
            Accès rapide
          </h2>

          <div className="flex gap-4 flex-wrap">

            <Link
              href="/attendance"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg"
            >
              Ma fiche de présence
            </Link>

            <Link
              href="/student/courses"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
            >
              Mes cours
            </Link>

            <Link
              href="/student/assignments"
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg"
            >
              Mes travaux pratiques
            </Link>

            <Link
              href="/student/exams"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg"
            >
              Mes examens
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

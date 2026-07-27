"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Portail Étudiant" />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Mes heures" value={stats ? stats.totalHeures : "…"} />
          <StatCard label="Mes présences" value={stats ? stats.presences : "…"} />
          <StatCard
            label="Quiz à faire"
            value={stats ? stats.quizRestants : "…"}
            accent="orange"
          />
          <StatCard label="Examens" value={stats ? stats.examens : "…"} />
        </div>

        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Accès rapide
          </h2>

          <div className="flex gap-3 flex-wrap">
            <LinkButton href="/student/attendance" variant="primary">
              Mes fiches de présence
            </LinkButton>

            <LinkButton href="/student/courses" variant="outline">
              Mes cours
            </LinkButton>

            <LinkButton href="/student/assignments" variant="outline">
              Mes travaux pratiques
            </LinkButton>

            <LinkButton href="/student/exams" variant="outline">
              Mes examens
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

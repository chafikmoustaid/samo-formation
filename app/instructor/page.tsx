"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

type Stats = {
  totalSeances: number;
  remisesAttente: number;
  totalRemises: number;
  fichesAttente: number;
};

export default function InstructorPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [coursesRes, submissionsRes, attendanceRes] = await Promise.all([
        supabase.from("courses").select("id"),
        supabase.from("assignment_submissions").select("id, note"),
        supabase.from("attendance").select("id, statut"),
      ]);

      if (!active) return;

      const totalSeances = coursesRes.data?.length ?? 0;
      const totalRemises = submissionsRes.data?.length ?? 0;
      const remisesAttente = (submissionsRes.data ?? []).filter(
        (s) => s.note === null
      ).length;
      const fichesAttente = (attendanceRes.data ?? []).filter(
        (f) => f.statut === "en_attente"
      ).length;

      setStats({ totalSeances, remisesAttente, totalRemises, fichesAttente });
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Portail Formateur" />

        <div className="grid md:grid-cols-4 gap-6">
          <StatCard
            label="Séances publiées"
            value={stats ? stats.totalSeances : "…"}
          />
          <StatCard
            label="Fiches à valider"
            value={stats ? stats.fichesAttente : "…"}
            accent="orange"
          />
          <StatCard
            label="Remises à corriger"
            value={stats ? stats.remisesAttente : "…"}
            accent="orange"
          />
          <StatCard
            label="Total remises TP"
            value={stats ? stats.totalRemises : "…"}
          />
        </div>

        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Accès rapide
          </h2>

          <div className="flex flex-wrap gap-3">
            <LinkButton href="/instructor/students" variant="primary">
              Mes étudiants
            </LinkButton>

            <LinkButton href="/instructor/attendance" variant="outline">
              Fiches de présence à valider
            </LinkButton>

            <LinkButton href="/instructor/import-support" variant="outline">
              Publier un support
            </LinkButton>

            <LinkButton href="/instructor/courses" variant="outline">
              Supports & TP par séance
            </LinkButton>

            <LinkButton href="/instructor/assignments" variant="outline">
              Remises TP
            </LinkButton>

            <LinkButton href="/instructor/progress" variant="outline">
              Progression (classe)
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

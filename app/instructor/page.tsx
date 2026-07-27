"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  totalSeances: number;
  remisesAttente: number;
  totalRemises: number;
};

export default function InstructorPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [coursesRes, submissionsRes] = await Promise.all([
        supabase.from("courses").select("id"),
        supabase.from("assignment_submissions").select("id, note"),
      ]);

      if (!active) return;

      const totalSeances = coursesRes.data?.length ?? 0;
      const totalRemises = submissionsRes.data?.length ?? 0;
      const remisesAttente = (submissionsRes.data ?? []).filter(
        (s) => s.note === null
      ).length;

      setStats({ totalSeances, remisesAttente, totalRemises });
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
          Portail Formateur
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">Séances publiées</div>
            <div className="text-4xl font-bold mt-2">
              {stats ? stats.totalSeances : "…"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">Remises à corriger</div>
            <div className="text-4xl font-bold mt-2 text-orange-600">
              {stats ? stats.remisesAttente : "…"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">Total remises TP</div>
            <div className="text-4xl font-bold mt-2">
              {stats ? stats.totalRemises : "…"}
            </div>
          </div>
        </div>

        <div className="mt-10 bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Accès rapide</h2>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/instructor/import-support"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg"
            >
              📥 Publier un support
            </Link>

            <Link
              href="/instructor/courses"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg"
            >
              📄 Supports & TP par séance
            </Link>

            <Link
              href="/instructor/assignments"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
            >
              🛠 Remises TP
            </Link>

            <Link
              href="/instructor/results"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg"
            >
              📊 Résultats
            </Link>

            <Link
              href="/instructor/progress"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg"
            >
              📈 Progression
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

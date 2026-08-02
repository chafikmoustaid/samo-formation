"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type Matiere = { id: number; nom: string };

export default function InstructorPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresChargees, setMatieresChargees] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [coursesRes, submissionsRes, attendanceRes] = await Promise.all([
        supabase.from("courses").select("id"),
        supabase.from("assignment_submissions").select("id, note"),
        supabase.from("attendance").select("id, statut").is("supprime_le", null),
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

    async function chargerMatieres() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMatieresChargees(true);
        return;
      }

      const { data: profil } = await supabase
        .from("profiles")
        .select("matieres")
        .eq("id", user.id)
        .single();

      const nomsMatieres = (profil?.matieres as string[]) ?? [];

      if (nomsMatieres.length === 0) {
        setMatieresChargees(true);
        return;
      }

      const { data: matieresData } = await supabase
        .from("matieres")
        .select("id, nom")
        .in("nom", nomsMatieres)
        .order("nom");

      if (!active) return;
      setMatieres(matieresData ?? []);
      setMatieresChargees(true);
    }

    load();
    chargerMatieres();

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
            href="#matieres"
          />
          <StatCard
            label="Fiches à valider"
            value={stats ? stats.fichesAttente : "…"}
            accent="orange"
            href="/instructor/attendance"
          />
          <StatCard
            label="Remises à corriger"
            value={stats ? stats.remisesAttente : "…"}
            accent="orange"
            href="/instructor/assignments"
          />
          <StatCard
            label="Total remises TP"
            value={stats ? stats.totalRemises : "…"}
            href="/instructor/assignments"
          />
        </div>

        <div id="matieres" className="scroll-mt-8">
          <Card className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Mes matières
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Choisis une matière pour accéder à ses séances (supports et TP).
            </p>

            {!matieresChargees ? (
              <p className="text-sm text-gray-400">Chargement…</p>
            ) : matieres.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune matière ne t&apos;est encore assignée — demande à
                l&apos;administration de t&apos;en assigner depuis la Gestion
                des comptes.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matieres.map((m) => (
                  <Link
                    key={m.id}
                    href={`/instructor/matieres/${m.id}`}
                    className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-green-600 transition-colors text-sm font-medium text-gray-900"
                  >
                    {m.nom}
                  </Link>
                ))}
              </div>
            )}
          </Card>
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

            <LinkButton href="/development" variant="outline">
              Nouvelle fiche de développement
            </LinkButton>

            <LinkButton href="/development/history" variant="outline">
              Mes fiches de développement
            </LinkButton>

            <LinkButton href="/instructor/import-support" variant="outline">
              Publier un support
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

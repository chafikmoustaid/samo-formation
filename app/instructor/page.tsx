"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import ColorLinkButton from "@/components/ui/ColorLinkButton";
import { couleurPalette } from "@/lib/paletteCouleurs";

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
                {matieres.map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/instructor/matieres/${m.id}`}
                    style={{ backgroundColor: couleurPalette(i) }}
                    className="flex items-center rounded-lg px-4 py-3.5 text-white font-bold text-base shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
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
            <ColorLinkButton href="/instructor/students" color={couleurPalette(0)}>
              Mes étudiants
            </ColorLinkButton>

            <ColorLinkButton href="/instructor/attendance" color={couleurPalette(5)}>
              Fiches de présence à valider
            </ColorLinkButton>

            <ColorLinkButton href="/development" color={couleurPalette(2)}>
              Nouvelle fiche de développement
            </ColorLinkButton>

            <ColorLinkButton href="/development/history" color={couleurPalette(3)}>
              Mes fiches de développement
            </ColorLinkButton>

            <ColorLinkButton href="/instructor/import-support" color={couleurPalette(1)}>
              Publier un support
            </ColorLinkButton>

            <ColorLinkButton href="/instructor/assignments" color={couleurPalette(4)}>
              Remises TP
            </ColorLinkButton>

            <ColorLinkButton href="/instructor/progress" color={couleurPalette(6)}>
              Progression (classe)
            </ColorLinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

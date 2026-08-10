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
  totalQuizRemis: number;
  totalRemises: number;
  fichesAttente: number;
};

type Matiere = { id: number; nom: string };

export default function InstructorPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresChargees, setMatieresChargees] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [submissionsRes, attendanceRes, quizRes] = await Promise.all([
        supabase.from("assignment_submissions").select("id"),
        supabase.from("attendance").select("id, statut").is("supprime_le", null),
        supabase.from("quiz_results").select("id"),
      ]);

      if (!active) return;

      const totalRemises = submissionsRes.data?.length ?? 0;
      const totalQuizRemis = quizRes.data?.length ?? 0;
      const fichesAttente = (attendanceRes.data ?? []).filter(
        (f) => f.statut === "en_attente"
      ).length;

      setStats({ totalQuizRemis, totalRemises, fichesAttente });
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

    async function chargerRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!active) return;
      setEstAdmin(profil?.role === "admin");
    }

    load();
    chargerMatieres();
    chargerRole();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Portail Formateur" />

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard
            label="Fiches à valider"
            value={stats ? stats.fichesAttente : "…"}
            color={couleurPalette(5)}
            href="/instructor/attendance"
          />
          <StatCard
            label="Quiz remis"
            value={stats ? stats.totalQuizRemis : "…"}
            color={couleurPalette(4)}
            href="/instructor/results"
          />
          <StatCard
            label="TP remis"
            value={stats ? stats.totalRemises : "…"}
            color={couleurPalette(1)}
            href="/instructor/assignments"
          />
        </div>

        <div id="matieres" className="scroll-mt-8">
          <Card className="mt-8">
            <div className="border-l-4 border-green-700 pl-4 mb-5">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Mes matières
              </h2>
              <p className="text-base text-gray-600 mt-1">
                Choisis une matière pour accéder à ses séances (supports et TP).
              </p>
            </div>

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

            {estAdmin && (
              <ColorLinkButton href="/instructor/import-support" color={couleurPalette(1)}>
                Publier un support
              </ColorLinkButton>
            )}

            <ColorLinkButton href="/instructor/assignments" color={couleurPalette(4)}>
              Remises TP
            </ColorLinkButton>

            <ColorLinkButton href="/instructor/progress" color={couleurPalette(6)}>
              Progression (classe)
            </ColorLinkButton>

            <ColorLinkButton href="/instructor/feuilles-route" color={couleurPalette(2)}>
              Feuilles de route
            </ColorLinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

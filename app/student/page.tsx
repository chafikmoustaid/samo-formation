"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type Progression = {
  nomFormation: string;
  heuresValidees: number;
  heuresAttendues: number | null;
};

type Matiere = {
  id: number;
  nom: string;
};

// Un peu de couleur et une icône par matière — cycle sur une petite
// palette pour que "Mes matières" ne soit plus une rangée de boutons
// tous identiques. Les noms sont comparés en minuscules sans accents.
const MATIERE_STYLE: { motCle: string; icone: string; classes: string }[] = [
  { motCle: "support informatique", icone: "🖥️", classes: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" },
  { motCle: "reseautique", icone: "🌐", classes: "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100" },
  { motCle: "excel", icone: "📊", classes: "bg-green-50 border-green-200 text-green-800 hover:bg-green-100" },
  { motCle: "word", icone: "📄", classes: "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100" },
  { motCle: "outlook", icone: "📧", classes: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100" },
];
const MATIERE_STYLE_DEFAUT = [
  "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100",
  "bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100",
  "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
];

function sansAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function stylePourMatiere(nom: string, index: number) {
  const trouve = MATIERE_STYLE.find((m) => sansAccents(nom).includes(m.motCle));
  if (trouve) return trouve;
  return {
    icone: "📚",
    classes: MATIERE_STYLE_DEFAUT[index % MATIERE_STYLE_DEFAUT.length],
  };
}

export default function StudentPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const profilRes = await supabase
        .from("profiles")
        .select("formation_id, formations!profiles_formation_id_fkey(nom, heures_attendues)")
        .eq("id", user.id)
        .single();

      const formationId = (profilRes.data as any)?.formation_id ?? null;

      const [attendanceRes, sessionsRes, quizRes, examRes, matieresRes] =
        await Promise.all([
          supabase
            .from("attendance")
            .select("total_heures, statut")
            .eq("user_id", user.id),
          formationId
            ? supabase
                .from("sessions")
                .select("id")
                .eq("actif", true)
                .eq("formation_id", formationId)
            : supabase.from("sessions").select("id").eq("actif", true),
          supabase
            .from("quiz_results")
            .select("session_id")
            .eq("user_id", user.id),
          supabase.from("exam_results").select("id").eq("user_id", user.id),
          formationId
            ? supabase
                .from("formation_matieres")
                .select("matieres(id, nom)")
                .eq("formation_id", formationId)
            : Promise.resolve({ data: [] as any[] }),
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

      const matieresFormation = ((matieresRes as any).data ?? [])
        .map((row: any) => row.matieres)
        .filter(Boolean)
        .sort((a: Matiere, b: Matiere) => a.nom.localeCompare(b.nom));
      setMatieres(matieresFormation);

      const formation = (profilRes.data as any)?.formations;
      if (formation) {
        const heuresValidees = (attendanceRes.data ?? [])
          .filter((f: any) => f.statut === "validee")
          .reduce((sum, f: any) => sum + Number(f.total_heures || 0), 0);

        setProgression({
          nomFormation: formation.nom,
          heuresValidees,
          heuresAttendues: formation.heures_attendues,
        });
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Portail Étudiant"
          subtitle={progression ? progression.nomFormation : undefined}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Mes heures"
            value={stats ? stats.totalHeures : "…"}
            accent="blue"
          />
          <StatCard
            label="Mes présences"
            value={stats ? stats.presences : "…"}
            accent="purple"
          />
          <StatCard
            label="Quiz à faire"
            value={stats ? stats.quizRestants : "…"}
            accent="orange"
          />
          <StatCard
            label="Examens"
            value={stats ? stats.examens : "…"}
            accent="red"
          />
        </div>

        {matieres.length > 0 && (
          <Card className="mt-8 border-t-4 border-t-green-600">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              📚 Mes matières
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Choisis une matière pour voir ses séances.
            </p>

            <div className="flex gap-3 flex-wrap">
              {matieres.map((m, i) => {
                const style = stylePourMatiere(m.nom, i);
                return (
                  <Link
                    key={m.id}
                    href={`/student/matieres/${m.id}`}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${style.classes}`}
                  >
                    <span>{style.icone}</span>
                    {m.nom}
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {progression && (
          <Card className="mt-8 border-t-4 border-t-blue-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              📈 Progression — {progression.nomFormation}
            </h2>

            {progression.heuresAttendues ? (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  {progression.heuresValidees} h validées sur{" "}
                  {progression.heuresAttendues} h attendues
                </p>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (progression.heuresValidees / progression.heuresAttendues) * 100
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {progression.heuresValidees} h validées jusqu&apos;à maintenant.
              </p>
            )}
          </Card>
        )}

        <Card className="mt-8 border-t-4 border-t-amber-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ⚡ Accès rapide
          </h2>

          <div className="flex gap-3 flex-wrap">
            <LinkButton
              href="/attendance"
              variant="primary"
              className="!bg-green-600 hover:!bg-green-700"
            >
              + Nouvelle fiche de présence
            </LinkButton>

            <LinkButton
              href="/student/attendance"
              variant="outline"
              className="!border-blue-200 !text-blue-700 hover:!bg-blue-50"
            >
              Historique de mes présences
            </LinkButton>

            <LinkButton
              href="/student/exams"
              variant="outline"
              className="!border-red-200 !text-red-700 hover:!bg-red-50"
            >
              Mes examens
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import ColorLinkButton from "@/components/ui/ColorLinkButton";
import { couleurPalette } from "@/lib/paletteCouleurs";

type Progression = {
  nomFormation: string;
  heuresValidees: number;
  heuresAttendues: number | null;
};

type Matiere = {
  id: number;
  nom: string;
};

export default function StudentPage() {
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

      const [attendanceRes, matieresRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("total_heures, statut")
          .eq("user_id", user.id)
          .is("supprime_le", null),
        formationId
          ? supabase
              .from("formation_matieres")
              .select("matieres(id, nom)")
              .eq("formation_id", formationId)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      if (!active) return;

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
      <div className="max-w-5xl mx-auto">
        {/* Le nom de la formation est l'information la plus importante de
            cette page : c'est le vrai titre, "Portail étudiant" passe en
            simple repère au-dessus. */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Portail étudiant
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            {progression ? progression.nomFormation : "…"}
          </h1>
        </div>

        {progression && (
          <Card className="mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Progression
            </h2>

            {progression.heuresAttendues ? (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  {progression.heuresValidees} h validées sur{" "}
                  {progression.heuresAttendues} h attendues
                </p>
                <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
                  <div
                    className="bg-green-700 h-2 rounded transition-all"
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

        {matieres.length > 0 && (
          <Card className="mb-6">
            <div className="border-l-4 border-green-700 pl-4 mb-5">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Mes matières
              </h2>
              <p className="text-base text-gray-600 mt-1">
                Choisis une matière pour voir ses séances.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {matieres.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/student/matieres/${m.id}`}
                  style={{ backgroundColor: couleurPalette(i) }}
                  className="flex items-center rounded-lg px-4 py-3.5 text-white font-bold text-base shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {m.nom}
                </Link>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Accès rapide
          </h2>

          <div className="flex gap-3 flex-wrap">
            <ColorLinkButton href="/attendance" color={couleurPalette(0)}>
              + Nouvelle fiche de présence
            </ColorLinkButton>

            <ColorLinkButton href="/student/attendance" color={couleurPalette(5)}>
              Historique de mes présences
            </ColorLinkButton>

            <ColorLinkButton href="/student/exams" color={couleurPalette(1)}>
              Mes examens
            </ColorLinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

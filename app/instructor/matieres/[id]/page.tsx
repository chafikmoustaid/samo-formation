"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type Seance = {
  id: number;
  numero: number;
  titre: string;
  formation_id: number;
};

type Formation = { id: number; nom: string };

export default function InstructorMatiereSeancesPage() {
  const params = useParams<{ id: string }>();
  const matiereId = params.id;

  const [nomMatiere, setNomMatiere] = useState("");
  const [seances, setSeances] = useState<Seance[]>([]);
  const [formations, setFormations] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (matiereId) chargerSeances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matiereId]);

  async function chargerSeances() {
    setLoading(true);
    setErreur(null);

    const { data: matiere } = await supabase
      .from("matieres")
      .select("nom")
      .eq("id", Number(matiereId))
      .single();

    setNomMatiere(matiere?.nom ?? "Matière");

    // Un formateur peut enseigner la même matière dans plusieurs formations
    // (contrairement à l'étudiant, rattaché à une seule) — on part donc de
    // la matière, pas d'une formation précise.
    const { data: formationsLiees } = await supabase
      .from("formation_matieres")
      .select("formation_id, formations(id, nom)")
      .eq("matiere_id", Number(matiereId));

    const idsFormations = (formationsLiees ?? [])
      .map((f: any) => f.formation_id)
      .filter(Boolean);

    const nomsFormations: Record<number, string> = {};
    (formationsLiees ?? []).forEach((f: any) => {
      if (f.formations?.id) nomsFormations[f.formations.id] = f.formations.nom;
    });
    setFormations(nomsFormations);

    if (idsFormations.length === 0) {
      setSeances([]);
      setLoading(false);
      return;
    }

    const { data: sessionsData, error } = await supabase
      .from("sessions")
      .select("id, numero, titre, formation_id")
      .in("formation_id", idsFormations)
      .eq("matiere_id", Number(matiereId))
      .eq("actif", true)
      .order("formation_id")
      .order("numero");

    if (error) {
      setErreur("Erreur lors du chargement des séances.");
      setLoading(false);
      return;
    }

    setSeances(sessionsData ?? []);
    setLoading(false);
  }

  const formationsAAfficher = Array.from(new Set(seances.map((s) => s.formation_id)));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={nomMatiere}
          subtitle={
            seances.length > 0
              ? `${seances.length} séance${seances.length > 1 ? "s" : ""}`
              : undefined
          }
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        {loading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : erreur ? (
          <Card>
            <p className="text-sm text-red-600">{erreur}</p>
          </Card>
        ) : seances.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">
              Aucune séance publiée pour cette matière pour le moment.
            </p>
          </Card>
        ) : (
          formationsAAfficher.map((formationId) => (
            <div key={formationId} className="mb-8">
              {formationsAAfficher.length > 1 && (
                <h2 className="text-sm font-semibold text-gray-500 mb-3">
                  {formations[formationId] ?? "Formation"}
                </h2>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {seances
                  .filter((s) => s.formation_id === formationId)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col rounded-lg border border-gray-200 bg-white"
                    >
                      <div className="border-b border-gray-200 px-3 py-2">
                        <span className="text-xs font-semibold text-gray-500">
                          Séance {s.numero}
                        </span>
                      </div>

                      <div className="flex-1 p-3">
                        <p className="text-sm text-gray-900 leading-snug">
                          {s.titre}
                        </p>
                      </div>

                      <div className="flex border-t border-gray-200 divide-x divide-gray-200">
                        <Link
                          href={`/instructor/supports/${s.id}`}
                          className="flex-1 text-center text-sm py-2 text-green-700 hover:bg-green-50 transition-colors"
                        >
                          Support
                        </Link>
                        <Link
                          href={`/instructor/tp/${s.id}`}
                          className="flex-1 text-center text-sm py-2 text-green-700 hover:bg-green-50 transition-colors"
                        >
                          TP
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

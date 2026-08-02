"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";

type Seance = {
  id: number;
  numero: number;
  titre: string;
  formation_id: number;
};

export default function InstructorMatiereSeancesPage() {
  const params = useParams<{ id: string }>();
  const matiereId = params.id;

  const [nomMatiere, setNomMatiere] = useState("");
  const [seances, setSeances] = useState<Seance[]>([]);
  const [formations, setFormations] = useState<Record<number, string>>({});
  const [seancesExamen, setSeancesExamen] = useState<Set<number>>(new Set());
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

    const idsSeances = (sessionsData ?? []).map((s) => s.id);
    if (idsSeances.length > 0) {
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select("session_id")
        .in("session_id", idsSeances)
        .ilike("titre", "%examen%");

      setSeancesExamen(new Set((evaluations ?? []).map((e) => e.session_id)));
    }

    setLoading(false);
  }

  const formationsAAfficher = Array.from(new Set(seances.map((s) => s.formation_id)));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/instructor"
          className="inline-block text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Portail formateur
        </Link>

        <div className="rounded-xl overflow-hidden mb-6 shadow-sm">
          <div className="bg-gradient-to-r from-green-700 to-emerald-600 px-6 py-5">
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wide mb-1">
              Feuille de route du cours
            </p>
            <h1 className="text-2xl font-bold text-white">{nomMatiere}</h1>
            {seances.length > 0 && (
              <p className="text-emerald-50 text-sm mt-1">
                {seances.length} séance{seances.length > 1 ? "s" : ""} publiée
                {seances.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

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
          <>
            {formationsAAfficher.map((formationId) => (
              <div key={formationId} className="mb-6">
                {formationsAAfficher.length > 1 && (
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">
                    {formations[formationId] ?? "Formation"}
                  </h2>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {seances
                    .filter((s) => s.formation_id === formationId)
                    .map((s) => {
                      const estExamen = seancesExamen.has(s.id);

                      return (
                        <div
                          key={s.id}
                          className={`flex flex-col rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${
                            estExamen
                              ? "bg-red-50 border-red-300"
                              : "bg-amber-50 border-amber-200"
                          }`}
                        >
                          <div className="px-3 pt-2 pb-1">
                            <span
                              className={`text-xs font-bold ${
                                estExamen ? "text-red-700" : "text-amber-700"
                              }`}
                            >
                              S{s.numero}
                            </span>
                          </div>

                          <p
                            className={`px-3 pb-2 text-xs leading-snug line-clamp-3 flex-1 ${
                              estExamen ? "text-red-900" : "text-gray-800"
                            }`}
                          >
                            {s.titre}
                          </p>

                          <div
                            className={`flex border-t divide-x ${
                              estExamen
                                ? "border-red-300 divide-red-300"
                                : "border-amber-200 divide-amber-200"
                            }`}
                          >
                            <Link
                              href={`/instructor/supports/${s.id}`}
                              className="flex-1 text-center text-xs py-1.5 font-medium text-green-700 hover:bg-white/60 transition-colors"
                            >
                              Support
                            </Link>
                            <Link
                              href={`/instructor/tp/${s.id}`}
                              className="flex-1 text-center text-xs py-1.5 font-medium text-green-700 hover:bg-white/60 transition-colors"
                            >
                              TP
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-5 text-xs text-gray-600 border-t border-gray-200 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-300 inline-block" />
                Séance d&apos;examen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block" />
                Séance régulière
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

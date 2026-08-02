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

// Palette utilisée tant qu'une séance n'a pas de couleur_accent propre
// (extraite de son PowerPoint) — évite que toute la grille reste dans un
// seul ton pâle en attendant que chaque support ait sa couleur dédiée.
const PALETTE_SEANCES = [
  "#2563eb", // bleu
  "#7c3aed", // violet
  "#0d9488", // sarcelle
  "#4f46e5", // indigo
  "#db2777", // rose
  "#ea580c", // orange
  "#0891b2", // cyan
  "#65a30d", // vert olive
];

// Couleur de fond pleine (hex) d'une carte de séance : rouge soutenu pour un
// examen (prioritaire sur toute autre couleur), sinon la couleur extraite du
// PowerPoint de la séance si disponible, sinon une couleur de la palette
// tournante ci-dessus pour garder une grille bien colorée.
function couleurCellule(
  couleur: string | null | undefined,
  estExamen: boolean,
  index: number
): string {
  if (estExamen) return "#dc2626";
  if (couleur) return couleur;
  return PALETTE_SEANCES[index % PALETTE_SEANCES.length];
}

export default function InstructorMatiereSeancesPage() {
  const params = useParams<{ id: string }>();
  const matiereId = params.id;

  const [nomMatiere, setNomMatiere] = useState("");
  const [seances, setSeances] = useState<Seance[]>([]);
  const [formations, setFormations] = useState<Record<number, string>>({});
  const [seancesExamen, setSeancesExamen] = useState<Set<number>>(new Set());
  const [couleursSeances, setCouleursSeances] = useState<
    Record<number, string>
  >({});
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
      const [{ data: evaluations }, { data: lecons }] = await Promise.all([
        supabase
          .from("evaluations")
          .select("session_id")
          .in("session_id", idsSeances)
          .ilike("titre", "%examen%"),
        supabase
          .from("course_lessons")
          .select("session_id, couleur_accent")
          .in("session_id", idsSeances),
      ]);

      setSeancesExamen(new Set((evaluations ?? []).map((e) => e.session_id)));

      const couleurs: Record<number, string> = {};
      (lecons ?? []).forEach((l) => {
        if (l.couleur_accent) couleurs[l.session_id] = l.couleur_accent;
      });
      setCouleursSeances(couleurs);
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

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {seances
                    .filter((s) => s.formation_id === formationId)
                    .map((s, i) => {
                      const estExamen = seancesExamen.has(s.id);
                      const couleur = couleurCellule(couleursSeances[s.id], estExamen, i);

                      return (
                        <Link
                          key={s.id}
                          href={`/instructor/matieres/${matiereId}/seances/${s.id}`}
                          style={{ backgroundColor: couleur }}
                          className="flex flex-col min-h-[90px] rounded-xl px-3.5 py-3 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                          <span className="text-sm font-bold mb-1">
                            S{s.numero}
                          </span>

                          <p className="text-sm leading-snug line-clamp-3 text-white/95">
                            {s.titre}
                          </p>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-5 text-sm text-gray-600 border-t border-gray-200 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-sm bg-red-600 inline-block" />
                Séance d&apos;examen
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

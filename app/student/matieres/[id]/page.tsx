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
};

// Palette utilisée tant qu'une séance n'a pas de couleur_accent propre
// (extraite de son PowerPoint) — évite que toute la grille reste dans un
// seul ton pâle en attendant que chaque support ait sa couleur dédiée.
const PALETTE_SEANCES = [
  "#1E3A5F", // marine profond
  "#2C5F8A", // bleu acier
  "#3F5B66", // bleu-gris ardoise
  "#205072", // bleu pétrole
  "#2F5D50", // vert forêt sombre
  "#4B5563", // gris anthracite
  "#374151", // gris gunmetal
  "#5B6B79", // gris bleuté
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

export default function MatiereSeancesPage() {
  const params = useParams<{ id: string }>();
  const matiereId = params.id;

  const [nomMatiere, setNomMatiere] = useState("");
  const [nomFormation, setNomFormation] = useState("");
  const [seances, setSeances] = useState<Seance[]>([]);
  const [seancesCompletees, setSeancesCompletees] = useState<Set<number>>(
    new Set()
  );
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profil } = await supabase
      .from("profiles")
      .select("formation_id, formations!profiles_formation_id_fkey(nom)")
      .eq("id", user.id)
      .single();

    setNomFormation((profil as any)?.formations?.nom ?? "");

    if (!profil?.formation_id) {
      setErreur("Aucune formation n'est assignée à ton compte.");
      setLoading(false);
      return;
    }

    const { data: sessionsData, error } = await supabase
      .from("sessions")
      .select("id, numero, titre")
      .eq("formation_id", profil.formation_id)
      .eq("matiere_id", Number(matiereId))
      .eq("actif", true)
      .order("numero");

    if (error) {
      setErreur("Erreur lors du chargement des séances.");
      setLoading(false);
      return;
    }

    setSeances(sessionsData ?? []);

    const idsSeances = (sessionsData ?? []).map((s) => s.id);

    if (idsSeances.length > 0) {
      // Une séance est considérée "complétée" si l'étudiant a un résultat de
      // quiz enregistré pour elle — sert à afficher la progression et à
      // repérer automatiquement "Vous êtes ici" (la première non complétée).
      const [{ data: quizResults }, { data: evaluations }, { data: lecons }] =
        await Promise.all([
          supabase
            .from("quiz_results")
            .select("session_id")
            .eq("user_id", user.id)
            .in("session_id", idsSeances),
          supabase
            .from("evaluations")
            .select("session_id, titre")
            .in("session_id", idsSeances)
            .ilike("titre", "%examen%"),
          supabase
            .from("course_lessons")
            .select("session_id, couleur_accent")
            .in("session_id", idsSeances),
        ]);

      setSeancesCompletees(
        new Set((quizResults ?? []).map((q) => q.session_id))
      );
      setSeancesExamen(new Set((evaluations ?? []).map((e) => e.session_id)));

      const couleurs: Record<number, string> = {};
      (lecons ?? []).forEach((l) => {
        if (l.couleur_accent) couleurs[l.session_id] = l.couleur_accent;
      });
      setCouleursSeances(couleurs);
    }

    setLoading(false);
  }

  const nbCompletees = seances.filter((s) =>
    seancesCompletees.has(s.id)
  ).length;
  const indexActuelle = seances.findIndex(
    (s) => !seancesCompletees.has(s.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/student"
          className="inline-block text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Portail étudiant
        </Link>

        <div className="rounded-xl overflow-hidden mb-6 shadow-sm">
          <div className="bg-gradient-to-r from-green-700 to-emerald-600 px-6 py-5">
            <h1 className="text-2xl font-bold text-white">{nomMatiere}</h1>
            {seances.length > 0 && (
              <p className="text-emerald-50 text-sm mt-1">
                Les {seances.length} séances{nomFormation ? ` de ${nomFormation}` : ""}{" "}
                — {nbCompletees} / {seances.length} complétée
                {nbCompletees > 1 ? "s" : ""}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {seances.map((s, i) => {
                const complete = seancesCompletees.has(s.id);
                const estActuelle = i === indexActuelle;
                const estExamen = seancesExamen.has(s.id);
                const couleur = estActuelle
                  ? "#16a34a"
                  : couleurCellule(couleursSeances[s.id], estExamen, i);

                return (
                  <Link
                    key={s.id}
                    href={`/student/matieres/${matiereId}/seances/${s.id}`}
                    style={{ backgroundColor: couleur }}
                    className="flex flex-col min-h-[112px] rounded-lg px-3.5 py-3 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                        Séance {s.numero}
                      </span>
                      {complete && (
                        <span className="text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5">
                          ✓ Fait
                        </span>
                      )}
                    </div>

                    {estActuelle && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/90 mb-1">
                        Vous êtes ici
                      </p>
                    )}

                    <p className="text-sm font-medium leading-snug line-clamp-3 text-white">
                      {s.titre}
                    </p>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-gray-600 border-t border-gray-200 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-sm bg-green-600 inline-block" />
                Séance du jour
              </span>
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

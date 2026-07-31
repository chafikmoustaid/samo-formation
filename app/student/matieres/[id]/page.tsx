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
};

// Palette dégradée façon "feuille de route" : les séances sont réparties
// en 4 paliers de couleur (du bleu foncé au orange) selon leur position,
// quel que soit le nombre total de séances de la matière.
const PALIER_COULEURS = [
  { bandeau: "bg-blue-900", bouton: "bg-blue-900 hover:bg-blue-800" },
  { bandeau: "bg-blue-600", bouton: "bg-blue-600 hover:bg-blue-500" },
  { bandeau: "bg-teal-600", bouton: "bg-teal-600 hover:bg-teal-500" },
  { bandeau: "bg-green-700", bouton: "bg-green-700 hover:bg-green-600" },
  { bandeau: "bg-amber-600", bouton: "bg-amber-600 hover:bg-amber-500" },
];

function couleurPour(index: number, total: number) {
  const palier = Math.min(
    PALIER_COULEURS.length - 1,
    Math.floor((index / total) * PALIER_COULEURS.length)
  );
  return PALIER_COULEURS[palier];
}

export default function MatiereSeancesPage() {
  const params = useParams<{ id: string }>();
  const matiereId = params.id;

  const [nomMatiere, setNomMatiere] = useState("");
  const [seances, setSeances] = useState<Seance[]>([]);
  const [seancesCompletees, setSeancesCompletees] = useState<Set<number>>(
    new Set()
  );
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
      .select("formation_id")
      .eq("id", user.id)
      .single();

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

    // Une séance est considérée "complétée" si l'étudiant a un résultat de
    // quiz enregistré pour elle — sert à afficher la progression et à
    // repérer automatiquement "Vous êtes ici" (la première non complétée).
    const idsSeances = (sessionsData ?? []).map((s) => s.id);
    if (idsSeances.length > 0) {
      const { data: quizResults } = await supabase
        .from("quiz_results")
        .select("session_id")
        .eq("user_id", user.id)
        .in("session_id", idsSeances);

      setSeancesCompletees(
        new Set((quizResults ?? []).map((q) => q.session_id))
      );
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
        <PageHeader
          title={nomMatiere}
          subtitle={
            seances.length > 0
              ? `Votre feuille de route complète — ${seances.length} séance${
                  seances.length > 1 ? "s" : ""
                }`
              : undefined
          }
          backHref="/student"
          backLabel="← Portail étudiant"
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {seances.map((s, i) => {
                const complete = seancesCompletees.has(s.id);
                const estActuelle = i === indexActuelle;
                const couleur = couleurPour(i, seances.length);

                return (
                  <Link
                    key={s.id}
                    href={`/student/matieres/${matiereId}/seances/${s.id}`}
                    className={`group flex flex-col rounded-xl overflow-hidden border transition-shadow hover:shadow-md ${
                      estActuelle
                        ? "border-green-400 ring-2 ring-green-200"
                        : "border-gray-100"
                    } bg-white`}
                  >
                    <div
                      className={`${couleur.bandeau} text-white px-3 py-2 flex items-center justify-between`}
                    >
                      <span className="text-xs font-bold opacity-90">
                        S{s.numero}
                      </span>
                      {complete && (
                        <span className="text-xs font-bold">✓</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between p-3">
                      <div>
                        {estActuelle && (
                          <p className="text-[11px] font-semibold text-green-700 mb-1">
                            ← Vous êtes ici
                          </p>
                        )}
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {s.titre}
                        </p>
                      </div>

                      <div
                        className={`mt-3 text-center text-white text-xs font-semibold rounded-lg py-2 ${couleur.bouton}`}
                      >
                        Séance {s.numero}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="rounded-xl bg-gray-900 text-gray-200 text-xs px-4 py-3 text-center">
              {seances.length} séance{seances.length > 1 ? "s" : ""} ·{" "}
              {nbCompletees} complétée{nbCompletees > 1 ? "s" : ""} · SAMO
              Formation
            </div>
          </>
        )}
      </div>
    </div>
  );
}

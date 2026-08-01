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
              ? `${seances.length} séance${seances.length > 1 ? "s" : ""}`
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              {seances.map((s, i) => {
                const complete = seancesCompletees.has(s.id);
                const estActuelle = i === indexActuelle;

                return (
                  <Link
                    key={s.id}
                    href={`/student/matieres/${matiereId}/seances/${s.id}`}
                    className={`flex flex-col rounded-lg border bg-white hover:border-green-600 transition-colors ${
                      estActuelle ? "border-green-600" : "border-gray-200"
                    }`}
                  >
                    <div className="border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Séance {s.numero}
                      </span>
                      {complete && (
                        <span className="text-xs font-semibold text-green-700">
                          Fait
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-3">
                      {estActuelle && (
                        <p className="text-[11px] font-semibold text-green-700 mb-1">
                          Vous êtes ici
                        </p>
                      )}
                      <p className="text-sm text-gray-900 leading-snug">
                        {s.titre}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <p className="text-xs text-gray-500">
              {nbCompletees} / {seances.length} séance
              {seances.length > 1 ? "s" : ""} complétée
              {nbCompletees > 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

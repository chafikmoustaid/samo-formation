"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";

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
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={nomMatiere}
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
          <div className="flex flex-col gap-3">
            {seances.map((s) => (
              <LinkButton
                key={s.id}
                href={`/student/matieres/${matiereId}/seances/${s.id}`}
                variant="outline"
                className="justify-start text-left w-full"
              >
                Séance {s.numero} — {s.titre}
              </LinkButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

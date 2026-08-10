"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type FeuilleRoute = {
  id: number;
  instructor_id: string;
  student_id: string;
  matiere_id: number;
  formation_id: number | null;
};

type Seance = { id: number; numero: number; titre: string };

type Entree = {
  id: number;
  session_id: number;
  date_seance: string;
  heure_debut: string | null;
  heure_fin: string | null;
  theorie_donnee: string | null;
  pratiques_exercices: string | null;
  evaluations_notees: string | null;
  notes: string | null;
};

export default function AdminFeuilleDeRouteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [feuille, setFeuille] = useState<FeuilleRoute | null>(null);
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [nomFormateur, setNomFormateur] = useState("");
  const [nomFormation, setNomFormation] = useState("");
  const [nomMatiere, setNomMatiere] = useState("");
  const [seances, setSeances] = useState<Map<number, Seance>>(new Map());
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (id) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function charger() {
    setChargement(true);

    const { data } = await supabase
      .from("road_maps")
      .select("id, instructor_id, student_id, matiere_id, formation_id")
      .eq("id", Number(id))
      .single();

    if (data) {
      setFeuille(data as FeuilleRoute);

      const [
        { data: etudiant },
        { data: formateur },
        formationRes,
        { data: matiere },
        { data: seancesData },
        { data: entreesData },
      ] = await Promise.all([
        supabase.from("profiles").select("nom_complet, email").eq("id", data.student_id).single(),
        supabase.from("profiles").select("nom_complet, email").eq("id", data.instructor_id).single(),
        data.formation_id
          ? supabase.from("formations").select("nom").eq("id", data.formation_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("matieres").select("nom").eq("id", data.matiere_id).single(),
        data.formation_id
          ? supabase
              .from("sessions")
              .select("id, numero, titre")
              .eq("formation_id", data.formation_id)
              .eq("matiere_id", data.matiere_id)
          : Promise.resolve({ data: [] }),
        supabase
          .from("road_map_entries")
          .select(
            "id, session_id, date_seance, heure_debut, heure_fin, theorie_donnee, pratiques_exercices, evaluations_notees, notes"
          )
          .eq("road_map_id", data.id),
      ]);

      setNomEtudiant(etudiant?.nom_complet ?? etudiant?.email ?? "Étudiant");
      setNomFormateur(formateur?.nom_complet ?? formateur?.email ?? "Formateur");
      setNomFormation((formationRes as { data: { nom: string } | null }).data?.nom ?? "");
      setNomMatiere(matiere?.nom ?? "Matière");

      const carteSeances = new Map<number, Seance>();
      ((seancesData as Seance[]) ?? []).forEach((s) => carteSeances.set(s.id, s));
      setSeances(carteSeances);

      const entreesTriees = ((entreesData as Entree[]) ?? []).sort(
        (a, b) => (carteSeances.get(a.session_id)?.numero ?? 0) - (carteSeances.get(b.session_id)?.numero ?? 0)
      );
      setEntrees(entreesTriees);
    }

    setChargement(false);
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  if (!feuille) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Feuille de route introuvable"
            backHref="/dashboard/feuilles-route"
            backLabel="← Retour aux feuilles de route"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title={`Feuille de route — ${nomEtudiant}`}
          subtitle={`${nomMatiere} — formateur : ${nomFormateur}${nomFormation ? ` — ${nomFormation}` : ""}`}
          backHref="/dashboard/feuilles-route"
          backLabel="← Retour aux feuilles de route"
        />

        <div className="mb-5 text-sm rounded-lg px-4 py-3 border-2 bg-gray-50 border-gray-200 text-gray-600">
          Lecture seule — l&apos;administration ne peut pas modifier une
          feuille de route, seulement la consulter.
        </div>

        {entrees.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-sm">Aucune séance ajoutée à cette feuille de route.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {entrees.map((e) => {
              const s = seances.get(e.session_id);
              return (
                <Card key={e.id} className="border-t-4 border-t-green-600">
                  <h3 className="text-base font-bold text-green-800 mb-5">
                    Séance {s?.numero ?? "?"} — {s?.titre ?? ""}
                  </h3>

                  <div className="space-y-5">
                    <div className="grid sm:grid-cols-3 gap-5 text-sm">
                      <div>
                        <p className="font-semibold text-gray-500">Date</p>
                        <p>{e.date_seance}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500">Heure de début</p>
                        <p>{e.heure_debut ?? "—"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500">Heure de fin</p>
                        <p>{e.heure_fin ?? "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-500 text-sm mb-1">Théorie donnée</p>
                      <p className="whitespace-pre-wrap text-gray-900">
                        {e.theorie_donnee || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-500 text-sm mb-1">
                        Pratiques / exercices (non notés)
                      </p>
                      <p className="whitespace-pre-wrap text-gray-900">
                        {e.pratiques_exercices || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-500 text-sm mb-1">Évaluations notées</p>
                      <p className="whitespace-pre-wrap text-gray-900">
                        {e.evaluations_notees || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-500 text-sm mb-1">Remarques</p>
                      <p className="whitespace-pre-wrap text-gray-900">{e.notes || "—"}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

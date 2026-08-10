"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
  ouverte: boolean;
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
  const [telechargement, setTelechargement] = useState(false);
  const [pliageGlobal, setPliageGlobal] = useState<"ouvert" | "ferme" | null>(null);

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

      const entreesTriees = ((entreesData as Omit<Entree, "ouverte">[]) ?? [])
        .map((e) => ({ ...e, ouverte: false }))
        .sort(
          (a, b) =>
            (carteSeances.get(a.session_id)?.numero ?? 0) - (carteSeances.get(b.session_id)?.numero ?? 0)
        );
      setEntrees(entreesTriees);
    }

    setChargement(false);
  }

  function basculerOuverture(id: number) {
    setEntrees((prev) => prev.map((e) => (e.id === id ? { ...e, ouverte: !e.ouverte } : e)));
  }

  function toutDeplierOuReplier(ouvrir: boolean) {
    setEntrees((prev) => prev.map((e) => ({ ...e, ouverte: ouvrir })));
    setPliageGlobal(ouvrir ? "ouvert" : "ferme");
  }

  async function telechargerPdf() {
    if (!feuille) return;
    setTelechargement(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`/api/pdf-road-map/${feuille.id}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    setTelechargement(false);

    if (!response.ok) {
      alert("Impossible de générer le PDF.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomFichierDepuisReponse(response, `feuille-de-route-${feuille.id}.pdf`);
    a.click();
    URL.revokeObjectURL(url);
  }

  function nomFichierDepuisReponse(reponse: Response, repli: string): string {
    const entete = reponse.headers.get("Content-Disposition") ?? "";
    const utf8 = entete.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8) {
      try {
        return decodeURIComponent(utf8[1]);
      } catch {
        // ignore, on tente le repli ASCII ci-dessous
      }
    }
    const ascii = entete.match(/filename="([^"]+)"/i);
    if (ascii) return ascii[1];
    return repli;
  }

  if (chargement) {
    return <div className="min-h-screen bg-gray-50 p-8">Chargement...</div>;
  }

  if (!feuille) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Feuille de route introuvable</h1>
          <Link href="/dashboard/feuilles-route" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux feuilles de route
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">
                Feuille de route — {nomEtudiant}
              </h1>
              <span className="inline-flex items-center rounded-full bg-green-700 text-white px-3 py-1 text-sm font-bold shadow-sm">
                {nomMatiere}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={telechargerPdf}
              disabled={telechargement}
              className="shrink-0"
            >
              {telechargement ? "Génération..." : "📄 Télécharger le PDF"}
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Formateur : {nomFormateur}
            {nomFormation ? ` — ${nomFormation}` : ""}
          </p>

          <Link
            href="/dashboard/feuilles-route"
            className="inline-block mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux feuilles de route
          </Link>
        </div>

        <div className="mb-5 text-sm rounded-lg px-4 py-3 border-2 bg-gray-50 border-gray-200 text-gray-600">
          Lecture seule — l&apos;administration ne peut pas modifier une
          feuille de route, seulement la consulter.
        </div>

        {entrees.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-sm">Aucune séance ajoutée à cette feuille de route.</p>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                {entrees.length} séance{entrees.length > 1 ? "s" : ""}
              </p>
              <div className="relative inline-flex w-56 items-center rounded-full bg-gray-800 p-1 text-sm font-bold select-none shadow-inner">
                <span
                  className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-green-600 shadow-[0_2px_6px_rgba(0,0,0,0.45)] ring-1 ring-green-400/50 transition-transform duration-300 ease-out ${
                    pliageGlobal === "ferme" ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                <button
                  onClick={() => toutDeplierOuReplier(true)}
                  className={`relative z-10 flex-1 rounded-full py-1.5 text-center transition-colors ${
                    pliageGlobal === "ferme" ? "text-gray-400" : "text-white"
                  }`}
                >
                  Tout déplier
                </button>
                <button
                  onClick={() => toutDeplierOuReplier(false)}
                  className={`relative z-10 flex-1 rounded-full py-1.5 text-center transition-colors ${
                    pliageGlobal === "ferme" ? "text-white" : "text-gray-400"
                  }`}
                >
                  Tout replier
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {entrees.map((e) => {
                const s = seances.get(e.session_id);
                return (
                  <Card key={e.id} className="border-t-4 border-t-green-600 !p-0 overflow-hidden">
                    <button
                      onClick={() => basculerOuverture(e.id)}
                      className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-green-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 text-green-700 transition-transform ${
                            e.ouverte ? "rotate-90" : ""
                          }`}
                        >
                          ▶
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-green-800 truncate">
                            Séance {s?.numero ?? "?"} — {s?.titre ?? ""}
                          </h3>
                          {!e.ouverte && (
                            <p className="text-xs text-gray-500 truncate">
                              {e.date_seance}
                              {e.theorie_donnee ? ` — ${e.theorie_donnee}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    {e.ouverte && (
                      <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
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
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type FeuilleRoute = {
  id: number;
  instructor_id: string;
  student_id: string;
  date_seance: string;
  heure_debut: string | null;
  heure_fin: string | null;
  theorie_donnee: string | null;
  pratiques_exercices: string | null;
  evaluations_notees: string | null;
  notes: string | null;
};

export default function FeuilleDeRouteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [feuille, setFeuille] = useState<FeuilleRoute | null>(null);
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "succes" | "erreur" } | null>(null);
  const [proprietaire, setProprietaire] = useState(false);

  useEffect(() => {
    if (id) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function charger() {
    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("road_maps")
      .select(
        "id, instructor_id, student_id, date_seance, heure_debut, heure_fin, theorie_donnee, pratiques_exercices, evaluations_notees, notes"
      )
      .eq("id", Number(id))
      .single();

    if (data) {
      setFeuille(data as FeuilleRoute);
      setProprietaire(user?.id === data.instructor_id);

      const { data: etudiant } = await supabase
        .from("profiles")
        .select("nom_complet, email")
        .eq("id", data.student_id)
        .single();
      setNomEtudiant(etudiant?.nom_complet ?? etudiant?.email ?? "Étudiant");
    }

    setChargement(false);
  }

  function champ<K extends keyof FeuilleRoute>(cle: K, valeur: FeuilleRoute[K]) {
    setFeuille((prev) => (prev ? { ...prev, [cle]: valeur } : prev));
  }

  async function enregistrer() {
    if (!feuille) return;
    setMessage(null);
    setEnregistrement(true);

    const { error } = await supabase
      .from("road_maps")
      .update({
        date_seance: feuille.date_seance,
        heure_debut: feuille.heure_debut || null,
        heure_fin: feuille.heure_fin || null,
        theorie_donnee: feuille.theorie_donnee,
        pratiques_exercices: feuille.pratiques_exercices,
        evaluations_notees: feuille.evaluations_notees,
        notes: feuille.notes,
      })
      .eq("id", feuille.id);

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    setMessage({ type: "succes", texte: "Modifications enregistrées." });
  }

  async function supprimer() {
    if (!feuille) return;
    if (!confirm("Supprimer définitivement cette feuille de route ?")) return;

    setSuppression(true);
    const { error } = await supabase.from("road_maps").delete().eq("id", feuille.id);
    setSuppression(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    router.push("/instructor/feuilles-route");
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
            backHref="/instructor/feuilles-route"
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
          subtitle={feuille.date_seance}
          backHref="/instructor/feuilles-route"
          backLabel="← Retour aux feuilles de route"
        />

        <Card>
          {!proprietaire && (
            <div className="mb-5 text-sm rounded-lg px-4 py-3 border-2 bg-amber-50 border-amber-200 text-amber-800">
              Cette feuille de route appartient à un autre formateur — lecture seule.
            </div>
          )}

          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">Date</label>
                <input
                  type="date"
                  value={feuille.date_seance}
                  disabled={!proprietaire}
                  onChange={(e) => champ("date_seance", e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Heure de début
                </label>
                <input
                  type="time"
                  value={feuille.heure_debut ?? ""}
                  disabled={!proprietaire}
                  onChange={(e) => champ("heure_debut", e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-800 mb-1">
                  Heure de fin
                </label>
                <input
                  type="time"
                  value={feuille.heure_fin ?? ""}
                  disabled={!proprietaire}
                  onChange={(e) => champ("heure_fin", e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Théorie donnée
              </label>
              <textarea
                value={feuille.theorie_donnee ?? ""}
                disabled={!proprietaire}
                onChange={(e) => champ("theorie_donnee", e.target.value)}
                rows={3}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Pratiques / exercices (non notés)
              </label>
              <textarea
                value={feuille.pratiques_exercices ?? ""}
                disabled={!proprietaire}
                onChange={(e) => champ("pratiques_exercices", e.target.value)}
                rows={2}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Évaluations notées
              </label>
              <textarea
                value={feuille.evaluations_notees ?? ""}
                disabled={!proprietaire}
                onChange={(e) => champ("evaluations_notees", e.target.value)}
                rows={2}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Remarques
              </label>
              <textarea
                value={feuille.notes ?? ""}
                disabled={!proprietaire}
                onChange={(e) => champ("notes", e.target.value)}
                rows={2}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
              />
            </div>
          </div>

          {message && (
            <div
              className={`mt-5 text-sm rounded-lg px-4 py-3 border-2 ${
                message.type === "erreur"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-800"
              }`}
            >
              {message.texte}
            </div>
          )}

          {proprietaire && (
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={enregistrer} disabled={enregistrement}>
                {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
              <Button variant="danger" onClick={supprimer} disabled={suppression}>
                {suppression ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

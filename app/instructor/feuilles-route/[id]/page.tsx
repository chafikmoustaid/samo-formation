"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type FeuilleRoute = {
  id: number;
  student_id: string;
  matiere_id: number;
  formation_id: number | null;
  instructor_id: string;
};

type Seance = {
  id: number;
  numero: number;
  titre: string;
  formation_id: number;
  matiere_id: number | null;
};

type Entree = {
  id: number | null;
  cle: string;
  session_id: number;
  date_seance: string;
  heure_debut: string;
  heure_fin: string;
  theorie_donnee: string;
  pratiques_exercices: string;
  evaluations_notees: string;
  notes: string;
  ouverte: boolean;
};

let compteurTemp = 0;

export default function FeuilleDeRouteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [feuille, setFeuille] = useState<FeuilleRoute | null>(null);
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [nomMatiere, setNomMatiere] = useState("");
  const [seancesDeLaMatiere, setSeancesDeLaMatiere] = useState<Seance[]>([]);
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [seanceAAjouter, setSeanceAAjouter] = useState("");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState<string | null>(null);
  const [telechargement, setTelechargement] = useState(false);
  const [message, setMessage] = useState<{ texte: string; type: "succes" | "erreur" } | null>(
    null
  );
  const [proprietaire, setProprietaire] = useState(false);
  const [pliageGlobal, setPliageGlobal] = useState<"ouvert" | "ferme" | null>(null);

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
      .select("id, student_id, matiere_id, formation_id, instructor_id")
      .eq("id", Number(id))
      .single();

    if (data) {
      setFeuille(data as FeuilleRoute);
      setProprietaire(user?.id === data.instructor_id);

      const [{ data: etudiant }, { data: matiere }, { data: seancesData }, { data: entreesData }] =
        await Promise.all([
          supabase.from("profiles").select("nom_complet, email").eq("id", data.student_id).single(),
          supabase.from("matieres").select("nom").eq("id", data.matiere_id).single(),
          data.formation_id
            ? supabase
                .from("sessions")
                .select("id, numero, titre, formation_id, matiere_id")
                .eq("formation_id", data.formation_id)
                .eq("matiere_id", data.matiere_id)
                .order("numero", { ascending: true })
            : Promise.resolve({ data: [] }),
          supabase
            .from("road_map_entries")
            .select(
              "id, session_id, date_seance, heure_debut, heure_fin, theorie_donnee, pratiques_exercices, evaluations_notees, notes"
            )
            .eq("road_map_id", data.id),
        ]);

      setNomEtudiant(etudiant?.nom_complet ?? etudiant?.email ?? "Étudiant");
      setNomMatiere(matiere?.nom ?? "Matière");
      const seancesTriees = (seancesData as Seance[]) ?? [];
      setSeancesDeLaMatiere(seancesTriees);

      const entreesTriees = ((entreesData as Omit<Entree, "cle" | "ouverte">[]) ?? [])
        .map((e) => ({
          ...e,
          cle: `db-${e.id}`,
          heure_debut: e.heure_debut ?? "",
          heure_fin: e.heure_fin ?? "",
          theorie_donnee: e.theorie_donnee ?? "",
          pratiques_exercices: e.pratiques_exercices ?? "",
          evaluations_notees: e.evaluations_notees ?? "",
          notes: e.notes ?? "",
          // Réduites par défaut pour avoir une vue d'ensemble de toutes les
          // séances déjà enregistrées ; on les déplie une à une au besoin.
          ouverte: false,
        }))
        .sort((a, b) => {
          const numA = seancesTriees.find((s) => s.id === a.session_id)?.numero ?? 0;
          const numB = seancesTriees.find((s) => s.id === b.session_id)?.numero ?? 0;
          return numA - numB;
        });
      setEntrees(entreesTriees);
    }

    setChargement(false);
  }

  const seancesDisponibles = useMemo(() => {
    const idsUtilises = new Set(entrees.map((e) => e.session_id));
    return seancesDeLaMatiere.filter((s) => !idsUtilises.has(s.id));
  }, [seancesDeLaMatiere, entrees]);

  function infoSeance(sessionId: number) {
    return seancesDeLaMatiere.find((s) => s.id === sessionId) ?? null;
  }

  function ajouterSeance(sessionIdStr: string) {
    setSeanceAAjouter("");
    if (!sessionIdStr) return;
    const sessionId = Number(sessionIdStr);
    compteurTemp += 1;
    setEntrees((prev) => [
      ...prev,
      {
        id: null,
        cle: `temp-${compteurTemp}`,
        session_id: sessionId,
        date_seance: "",
        heure_debut: "",
        heure_fin: "",
        theorie_donnee: "",
        pratiques_exercices: "",
        evaluations_notees: "",
        notes: "",
        // Un nouveau bloc s'ouvre directement pour être rempli tout de suite.
        ouverte: true,
      },
    ]);
  }

  function champ<K extends keyof Entree>(cle: string, champKey: K, valeur: Entree[K]) {
    setEntrees((prev) =>
      prev.map((e) => (e.cle === cle ? { ...e, [champKey]: valeur } : e))
    );
  }

  function basculerOuverture(cle: string) {
    setEntrees((prev) =>
      prev.map((e) => (e.cle === cle ? { ...e, ouverte: !e.ouverte } : e))
    );
  }

  function toutDeplierOuReplier(ouvrir: boolean) {
    setEntrees((prev) => prev.map((e) => ({ ...e, ouverte: ouvrir })));
    setPliageGlobal(ouvrir ? "ouvert" : "ferme");
  }

  async function retirerEntree(entree: Entree) {
    if (!entree.id) {
      // Bloc pas encore enregistré : simple retrait local.
      setEntrees((prev) => prev.filter((e) => e.cle !== entree.cle));
      return;
    }
    if (!confirm("Supprimer définitivement cette séance de la feuille de route ?")) return;

    setSuppression(entree.cle);
    const { error } = await supabase.from("road_map_entries").delete().eq("id", entree.id);
    setSuppression(null);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    setEntrees((prev) => prev.filter((e) => e.cle !== entree.cle));
  }

  async function enregistrer() {
    if (!feuille) return;
    setMessage(null);

    for (const e of entrees) {
      if (!e.date_seance) {
        setMessage({
          type: "erreur",
          texte: `Renseigne la date pour la séance ${infoSeance(e.session_id)?.numero ?? ""}.`,
        });
        return;
      }
    }

    setEnregistrement(true);

    // Supabase-js remplit les clés manquantes par null sur un lot hétérogène :
    // on sépare donc les nouveaux blocs (sans id, à insérer) des blocs déjà
    // enregistrés (avec id, à mettre à jour) pour éviter d'envoyer id=null.
    const champsCommuns = (e: Entree) => ({
      road_map_id: feuille.id,
      session_id: e.session_id,
      date_seance: e.date_seance,
      heure_debut: e.heure_debut || null,
      heure_fin: e.heure_fin || null,
      theorie_donnee: e.theorie_donnee || null,
      pratiques_exercices: e.pratiques_exercices || null,
      evaluations_notees: e.evaluations_notees || null,
      notes: e.notes || null,
    });

    const nouvellesLignes = entrees.filter((e) => !e.id).map(champsCommuns);
    const lignesExistantes = entrees.filter((e) => e.id);

    if (nouvellesLignes.length > 0) {
      const { data, error } = await supabase
        .from("road_map_entries")
        .insert(nouvellesLignes)
        .select("id, session_id");

      if (error) {
        setEnregistrement(false);
        setMessage({ type: "erreur", texte: error.message });
        return;
      }

      setEntrees((prev) =>
        prev.map((e) => {
          const trouve = (data ?? []).find((d) => d.session_id === e.session_id);
          return trouve ? { ...e, id: trouve.id, cle: `db-${trouve.id}` } : e;
        })
      );
    }

    for (const e of lignesExistantes) {
      const { error } = await supabase
        .from("road_map_entries")
        .update(champsCommuns(e))
        .eq("id", e.id);

      if (error) {
        setEnregistrement(false);
        setMessage({ type: "erreur", texte: error.message });
        return;
      }
    }

    await supabase.from("road_maps").update({ updated_at: new Date().toISOString() }).eq("id", feuille.id);

    setEnregistrement(false);
    setMessage({ type: "succes", texte: "Feuille de route enregistrée." });
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

          <Link
            href="/instructor/feuilles-route"
            className="inline-block mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux feuilles de route
          </Link>
        </div>

        {!proprietaire && (
          <div className="mb-5 text-sm rounded-lg px-4 py-3 border-2 bg-amber-50 border-amber-200 text-amber-800">
            Cette feuille de route appartient à un autre formateur — lecture seule.
          </div>
        )}

        {proprietaire && (
          <Card className="mb-6">
            <label className="block text-sm font-semibold text-green-800 mb-1">
              Séance <span className="text-red-600">*</span>
            </label>
            <select
              value={seanceAAjouter}
              onChange={(e) => ajouterSeance(e.target.value)}
              className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 bg-white"
            >
              <option value="">
                {seancesDisponibles.length === 0
                  ? "— toutes les séances de cette matière sont déjà ajoutées —"
                  : "Choisir une séance à ajouter…"}
              </option>
              {seancesDisponibles.map((s) => (
                <option key={s.id} value={s.id}>
                  Séance {s.numero} — {s.titre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Choisis une séance complétée pour ajouter un nouveau bloc à remplir
              ci-dessous.
            </p>
          </Card>
        )}

        {entrees.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-sm">
              Aucune séance ajoutée pour le moment.
              {proprietaire ? " Utilise le sélecteur ci-dessus pour commencer." : ""}
            </p>
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
                const seance = infoSeance(e.session_id);
                const dateAffichee = e.date_seance
                  ? new Date(`${e.date_seance}T00:00:00`).toLocaleDateString("fr-CA")
                  : null;

                return (
                  <Card key={e.cle} className="border-t-4 border-t-green-600 !p-0 overflow-hidden">
                    <button
                      onClick={() => basculerOuverture(e.cle)}
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
                            Séance {seance?.numero ?? "?"} — {seance?.titre ?? ""}
                          </h3>
                          {!e.ouverte && (
                            <p className="text-xs text-gray-500 truncate">
                              {dateAffichee ?? "Date non renseignée"}
                              {e.theorie_donnee ? ` — ${e.theorie_donnee}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      {proprietaire && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            retirerEntree(e);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.stopPropagation();
                              retirerEntree(e);
                            }
                          }}
                          className="shrink-0 text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          {suppression === e.cle ? "Suppression..." : "Retirer"}
                        </span>
                      )}
                    </button>

                    {e.ouverte && (
                      <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
                        <div className="grid sm:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-sm font-semibold text-green-800 mb-1">
                              Date <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="date"
                              value={e.date_seance}
                              disabled={!proprietaire}
                              onChange={(ev) => champ(e.cle, "date_seance", ev.target.value)}
                              className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-green-800 mb-1">
                              Heure de début
                            </label>
                            <input
                              type="time"
                              value={e.heure_debut}
                              disabled={!proprietaire}
                              onChange={(ev) => champ(e.cle, "heure_debut", ev.target.value)}
                              className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-green-800 mb-1">
                              Heure de fin
                            </label>
                            <input
                              type="time"
                              value={e.heure_fin}
                              disabled={!proprietaire}
                              onChange={(ev) => champ(e.cle, "heure_fin", ev.target.value)}
                              className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-green-800 mb-1">
                            Théorie donnée
                          </label>
                          <textarea
                            value={e.theorie_donnee}
                            disabled={!proprietaire}
                            onChange={(ev) => champ(e.cle, "theorie_donnee", ev.target.value)}
                            rows={3}
                            placeholder="Ex. : Chapitre 2 — création de dossier, enregistrement, notions de base"
                            className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-green-800 mb-1">
                            Pratiques / exercices (non notés)
                          </label>
                          <textarea
                            value={e.pratiques_exercices}
                            disabled={!proprietaire}
                            onChange={(ev) => champ(e.cle, "pratiques_exercices", ev.target.value)}
                            rows={2}
                            className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-green-800 mb-1">
                            Évaluations notées
                          </label>
                          <textarea
                            value={e.evaluations_notees}
                            disabled={!proprietaire}
                            onChange={(ev) => champ(e.cle, "evaluations_notees", ev.target.value)}
                            rows={2}
                            className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-green-800 mb-1">
                            Remarques (facultatif)
                          </label>
                          <textarea
                            value={e.notes}
                            disabled={!proprietaire}
                            onChange={(ev) => champ(e.cle, "notes", ev.target.value)}
                            rows={2}
                            className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}

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
              {enregistrement ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button variant="secondary" onClick={() => router.push("/instructor/feuilles-route")}>
              Retour à la liste
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

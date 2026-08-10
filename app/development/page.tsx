"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
import {
  LigneDeveloppement,
  ligneDeveloppementVide,
  calculHeuresLigne,
  totalHeuresDeveloppement,
  lignesDansLaMemeSemaine,
  OPTIONS_HEURES_DEV,
  APPROBATEURS_DEVELOPPEMENT,
} from "@/lib/ficheDeveloppement";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function NouvelleFicheDeveloppementContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [nomFormateur, setNomFormateur] = useState("");
  const [sujet, setSujet] = useState("");
  const [approuvePar, setApprouvePar] = useState("");
  const [heuresAutorisees, setHeuresAutorisees] = useState("");
  const [heuresRealisees, setHeuresRealisees] = useState("");
  const [lignes, setLignes] = useState<LigneDeveloppement[]>([
    ligneDeveloppementVide(),
  ]);
  const [dateRemise, setDateRemise] = useState("");

  const [signature, setSignature] = useState("");
  const [signatureEnregistree, setSignatureEnregistree] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<{
    texte: string;
    type: "succes" | "erreur";
  } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [enregistrementBrouillon, setEnregistrementBrouillon] = useState(false);

  // Id de la fiche en cours d'édition (brouillon repris automatiquement, ou
  // fiche "brouillon"/"en_attente" rouverte explicitement via ?id=). null
  // tant qu'aucune fiche n'a encore été enregistrée / chargée.
  const [ficheId, setFicheId] = useState<number | null>(null);
  const [brouillonDepuis, setBrouillonDepuis] = useState<string | null>(null);

  const [chargement, setChargement] = useState(true);
  // Rempli si la fiche visée par ?id= ne peut plus être modifiée par
  // l'utilisateur courant (déjà validée/refusée, ou appartenant à
  // quelqu'un d'autre) — le formulaire reste alors verrouillé.
  const [erreurChargement, setErreurChargement] = useState<string | null>(
    null
  );
  const [formulaireVerrouille, setFormulaireVerrouille] = useState(false);

  useEffect(() => {
    initialiser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initialiser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setChargement(false);
      return;
    }

    const { data: profil } = await supabase
      .from("profiles")
      .select("nom_complet, signature_enregistree")
      .eq("id", user.id)
      .single();

    setNomFormateur(profil?.nom_complet ?? "");
    setSignatureEnregistree(profil?.signature_enregistree ?? null);

    if (idParam) {
      await chargerFicheParId(idParam, user.id);
    } else {
      await chargerBrouillonExistant(user.id);
    }

    setChargement(false);
  }

  // Rouvre explicitement une fiche précise (lien "Modifier" depuis la
  // fiche ou l'historique) — uniquement permis tant qu'elle appartient à
  // l'utilisateur courant et n'a pas encore été validée/refusée.
  async function chargerFicheParId(id: string, userId: string) {
    const { data, error } = await supabase
      .from("development_sheets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      setErreurChargement("Cette fiche de développement est introuvable.");
      setFormulaireVerrouille(true);
      return;
    }

    if (data.user_id !== userId) {
      setErreurChargement(
        "Cette fiche de développement ne t'appartient pas."
      );
      setFormulaireVerrouille(true);
      return;
    }

    if (data.statut !== "brouillon" && data.statut !== "en_attente") {
      setErreurChargement(
        "Cette fiche a déjà été validée ou refusée par l'administration : elle ne peut plus être modifiée."
      );
      setFormulaireVerrouille(true);
      return;
    }

    remplirFormulaire(data);
  }

  // Reprend le brouillon le plus récent du formateur, s'il en existe un —
  // pour qu'il puisse continuer à le compléter là où il s'était arrêté au
  // lieu de repartir d'une fiche vide à chaque visite. Ne recharge jamais
  // une fiche déjà "en_attente" : ça, c'est un choix explicite via le lien
  // "Modifier" (?id=), pas un comportement automatique.
  async function chargerBrouillonExistant(userId: string) {
    const { data } = await supabase
      .from("development_sheets")
      .select("*")
      .eq("user_id", userId)
      .eq("statut", "brouillon")
      .is("supprime_le", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return;

    remplirFormulaire(data);
  }

  function remplirFormulaire(data: any) {
    setFicheId(data.id);
    setNomFormateur(data.nom_formateur ?? "");
    setSujet(data.sujet ?? "");
    setApprouvePar(data.approuve_par ?? "");
    setHeuresAutorisees(
      data.heures_autorisees != null ? String(data.heures_autorisees) : ""
    );
    setHeuresRealisees(data.heures_realisees_texte ?? "");
    setLignes(
      Array.isArray(data.lignes) && data.lignes.length > 0
        ? data.lignes
        : [ligneDeveloppementVide()]
    );
    setDateRemise(data.date_remise ?? "");
    setBrouillonDepuis(data.created_at ?? null);
  }

  async function memoriserSignature(sig: string) {
    await supabase.rpc("update_own_signature", { nouvelle_signature: sig });
    setSignatureEnregistree(sig);
  }

  function modifierLigne(
    index: number,
    champ: keyof LigneDeveloppement,
    valeur: string
  ) {
    setLignes((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l))
    );
  }

  function ajouterJournee() {
    setLignes((prev) => [...prev, ligneDeveloppementVide()]);
  }

  function retirerJournee(index: number) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  const total = totalHeuresDeveloppement(lignes);

  // Enregistre la fiche en cours SANS exiger la signature ni la
  // validation complète du contenu — le formateur peut y revenir autant
  // de fois que nécessaire avant de l'envoyer pour validation.
  async function enregistrerBrouillon() {
    setMessage(null);

    if (!nomFormateur.trim()) {
      setMessage({
        type: "erreur",
        texte: "Le nom du(de la) formateur(trice) est obligatoire.",
      });
      return;
    }

    if (!sujet.trim()) {
      setMessage({
        type: "erreur",
        texte: "Précise le sujet du développement.",
      });
      return;
    }

    setEnregistrementBrouillon(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const lignesRemplies = lignes.filter(
      (l) => l.date || l.heureDebut || l.heureFin
    );

    const payload = {
      user_id: user?.id,
      nom_formateur: nomFormateur,
      sujet,
      approuve_par: approuvePar || null,
      heures_autorisees: heuresAutorisees ? Number(heuresAutorisees) : null,
      heures_realisees_texte: heuresRealisees || null,
      lignes: lignesRemplies,
      total_heures: totalHeuresDeveloppement(lignesRemplies),
      date_remise: dateRemise || null,
      statut: "brouillon",
    };

    if (ficheId) {
      const { error } = await supabase
        .from("development_sheets")
        .update(payload)
        .eq("id", ficheId);

      setEnregistrementBrouillon(false);

      if (error) {
        setMessage({ type: "erreur", texte: error.message });
        return;
      }
    } else {
      const { data: ficheCreee, error } = await supabase
        .from("development_sheets")
        .insert(payload)
        .select("id, created_at")
        .single();

      setEnregistrementBrouillon(false);

      if (error) {
        setMessage({ type: "erreur", texte: error.message });
        return;
      }

      setFicheId(ficheCreee.id);
      setBrouillonDepuis(ficheCreee.created_at);
    }

    setMessage({
      type: "succes",
      texte:
        "Brouillon enregistré. Tu peux fermer la page et y revenir plus tard pour la compléter — rien n'est encore envoyé à l'administration.",
    });
  }

  async function enregistrerFiche() {
    setMessage(null);

    if (!nomFormateur.trim()) {
      setMessage({
        type: "erreur",
        texte: "Le nom du(de la) formateur(trice) est obligatoire.",
      });
      return;
    }

    if (!sujet.trim()) {
      setMessage({ type: "erreur", texte: "Précise le sujet du développement." });
      return;
    }

    if (!approuvePar) {
      setMessage({ type: "erreur", texte: "Sélectionne le nom de la personne qui a approuvé." });
      return;
    }

    if (!heuresAutorisees.trim()) {
      setMessage({
        type: "erreur",
        texte: "Le nombre d'heures autorisées est obligatoire.",
      });
      return;
    }

    if (!heuresRealisees.trim()) {
      setMessage({
        type: "erreur",
        texte: "Le détail des heures réalisées à ce jour est obligatoire.",
      });
      return;
    }

    if (!dateRemise) {
      setMessage({
        type: "erreur",
        texte: "La date de remise des travaux est obligatoire.",
      });
      return;
    }

    const lignesRemplies = lignes.filter(
      (l) => l.date || l.heureDebut || l.heureFin
    );

    if (lignesRemplies.length === 0) {
      setMessage({
        type: "erreur",
        texte: "Ajoute au moins une journée (date, heure de début et de fin).",
      });
      return;
    }

    for (const l of lignesRemplies) {
      if (!l.date || !l.heureDebut || !l.heureFin) {
        setMessage({
          type: "erreur",
          texte:
            "Chaque journée ajoutée doit avoir une date, une heure de début et une heure de fin.",
        });
        return;
      }
    }

    if (!lignesDansLaMemeSemaine(lignesRemplies)) {
      setMessage({
        type: "erreur",
        texte:
          "Toutes les journées d'une même fiche doivent appartenir à la même semaine (du lundi au dimanche). Fais une fiche distincte pour une autre semaine.",
      });
      return;
    }

    if (!signature) {
      setMessage({ type: "erreur", texte: "Enregistre ta signature." });
      return;
    }

    setEnregistrement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user?.id,
      nom_formateur: nomFormateur,
      sujet,
      approuve_par: approuvePar || null,
      heures_autorisees: heuresAutorisees ? Number(heuresAutorisees) : null,
      heures_realisees_texte: heuresRealisees || null,
      lignes: lignesRemplies,
      total_heures: totalHeuresDeveloppement(lignesRemplies),
      date_remise: dateRemise || null,
      signature_formateur: signature,
      date_signature_formateur: new Date().toISOString(),
      statut: "en_attente",
    };

    const { error } = ficheId
      ? await supabase
          .from("development_sheets")
          .update(payload)
          .eq("id", ficheId)
      : await supabase.from("development_sheets").insert(payload);

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({
      type: "succes",
      texte:
        "Fiche de développement enregistrée avec succès. Elle attend maintenant la validation de l'administration.",
    });

    // La fiche envoyée n'est plus un brouillon modifiable librement : on
    // repart sur un formulaire vide pour ne pas la recharger tout seul à
    // la prochaine visite de /development.
    setFicheId(null);
    setBrouillonDepuis(null);
    setSujet("");
    setApprouvePar("");
    setHeuresAutorisees("");
    setHeuresRealisees("");
    setLignes([ligneDeveloppementVide()]);
    setDateRemise("");
    setSignature("");
  }

  if (chargement) {
    return <div className="p-8 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={
            ficheId
              ? "Modifier la fiche de développement"
              : "Nouvelle fiche de développement"
          }
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <Card>
          <div className="mb-6">
            <Image
              src="/logo-samo.png"
              alt="Formation SAMO"
              width={260}
              height={78}
              className="h-16 w-auto mb-3"
            />
          </div>

          {erreurChargement && (
            <div className="border border-red-200 bg-red-50 text-red-700 text-base rounded-lg p-4 mb-6">
              {erreurChargement}
            </div>
          )}

          {!formulaireVerrouille && (
            <>
              <div className="max-w-lg mb-6">
                <p className="text-base text-gray-600">
                  À remplir pour chaque période autorisée d&apos;heures de
                  développement.
                </p>
                <p className="text-sm text-red-600 mt-1">
                  * Champ obligatoire — la fiche ne peut pas être transférée
                  à l&apos;administration si un champ obligatoire est
                  manquant. Le brouillon, lui, peut être enregistré même
                  incomplet.
                </p>
              </div>

              {brouillonDepuis && (
                <div className="border border-blue-200 bg-blue-50 text-blue-800 text-base rounded-lg p-3 mb-6">
                  Brouillon en cours depuis le{" "}
                  {new Date(brouillonDepuis).toLocaleDateString("fr-CA")}.
                  Complète-le puis clique sur « Envoyer pour validation »
                  quand il est prêt.
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-base font-semibold text-green-800 mb-1">
                    Nom du(de la) formateur(trice) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomFormateur}
                    onChange={(e) => setNomFormateur(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-green-800 mb-1">
                    Sujet du développement <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    required
                    value={sujet}
                    onChange={(e) => setSujet(e.target.value)}
                    rows={3}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-green-800 mb-1">
                    Approuvé par <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={approuvePar}
                    onChange={(e) => setApprouvePar(e.target.value)}
                    className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg bg-white"
                  >
                    <option value="">Sélectionnez le nom</option>
                    {APPROBATEURS_DEVELOPPEMENT.map((nom) => (
                      <option key={nom} value={nom}>
                        {nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-base font-semibold text-green-800 mb-1">
                      Nombre d&apos;heures autorisées <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.5"
                      value={heuresAutorisees}
                      onChange={(e) => setHeuresAutorisees(e.target.value)}
                      className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-green-800 mb-1">
                      Détail des heures réalisées à ce jour <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex. : 4 sur 12"
                      value={heuresRealisees}
                      onChange={(e) => setHeuresRealisees(e.target.value)}
                      className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
                    />
                  </div>
                </div>

                <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-50 px-4 py-3 flex items-center justify-between border-b-2 border-green-200">
                    <h3 className="text-base font-semibold text-green-800">
                      Journée(s) travaillée(s) <span className="text-red-600">*</span>
                    </h3>
                    <p className="text-sm text-green-700">
                      Ajoute une ligne par journée — toutes de la même semaine.
                    </p>
                  </div>

                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-left text-gray-500 border-b bg-gray-50">
                        <th className="p-3 font-medium">Date</th>
                        <th className="p-3 font-medium">Heure de début</th>
                        <th className="p-3 font-medium">Heure de fin</th>
                        <th className="p-3 font-medium">Total</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((ligne, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-3">
                            <input
                              type="date"
                              required
                              value={ligne.date}
                              onChange={(e) =>
                                modifierLigne(index, "date", e.target.value)
                              }
                              className="border border-gray-300 rounded-lg px-2 py-1.5 text-base"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              required
                              value={ligne.heureDebut}
                              onChange={(e) =>
                                modifierLigne(index, "heureDebut", e.target.value)
                              }
                              className="border border-gray-300 rounded-lg px-2 py-1.5 text-base"
                            >
                              <option value="">—</option>
                              {OPTIONS_HEURES_DEV.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <select
                              required
                              value={ligne.heureFin}
                              onChange={(e) =>
                                modifierLigne(index, "heureFin", e.target.value)
                              }
                              className="border border-gray-300 rounded-lg px-2 py-1.5 text-base"
                            >
                              <option value="">—</option>
                              {OPTIONS_HEURES_DEV.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 font-semibold text-green-700">
                            {calculHeuresLigne(ligne) || 0} h
                          </td>
                          <td className="p-3">
                            {lignes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => retirerJournee(index)}
                                className="text-red-500 hover:text-red-700 text-base"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="px-4 py-3 border-t-2 border-green-200 bg-green-50 flex items-center justify-between">
                    <Button variant="ghost" onClick={ajouterJournee}>
                      + Ajouter une journée
                    </Button>
                    <p className="text-base font-semibold text-green-800">
                      Nombre total des heures : {total} h
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-base font-semibold text-green-800 mb-1">
                    Date de remise des travaux <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateRemise}
                    onChange={(e) => setDateRemise(e.target.value)}
                    className="border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={enregistrerBrouillon}
                  disabled={enregistrementBrouillon}
                >
                  {enregistrementBrouillon
                    ? "Enregistrement..."
                    : "Enregistrer le brouillon"}
                </Button>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Signature <span className="text-red-600">*</span>
                </h3>

                <SignaturePad
                  onSave={(sig) => setSignature(sig)}
                  nomParDefaut={nomFormateur}
                  signatureEnregistree={signatureEnregistree}
                  onEnregistrerPreference={memoriserSignature}
                />

                {signature && (
                  <p className="mt-2 text-base text-green-700 font-medium">
                    Signature enregistrée, prête à être envoyée.
                  </p>
                )}
              </div>

              {message && (
                <div
                  className={`mt-6 text-base rounded-lg px-4 py-3 border-2 ${
                    message.type === "erreur"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-green-50 border-green-200 text-green-800"
                  }`}
                >
                  {message.texte}
                </div>
              )}

              <div className="mt-6">
                <Button onClick={enregistrerFiche} disabled={enregistrement}>
                  {enregistrement ? "Envoi..." : "Envoyer pour validation"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function NouvelleFicheDeveloppement() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Chargement...</div>}>
      <NouvelleFicheDeveloppementContent />
    </Suspense>
  );
}

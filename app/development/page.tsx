"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

export default function NouvelleFicheDeveloppement() {
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

  useEffect(() => {
    chargerProfil();
  }, []);

  async function chargerProfil() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profil } = await supabase
      .from("profiles")
      .select("nom_complet, signature_enregistree")
      .eq("id", user.id)
      .single();

    setNomFormateur(profil?.nom_complet ?? "");
    setSignatureEnregistree(profil?.signature_enregistree ?? null);
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

  async function enregistrerFiche() {
    setMessage(null);

    if (!sujet.trim()) {
      setMessage({ type: "erreur", texte: "Précise le sujet du développement." });
      return;
    }

    if (!approuvePar) {
      setMessage({ type: "erreur", texte: "Sélectionne le nom de la personne qui a approuvé." });
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

    const { error } = await supabase.from("development_sheets").insert({
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
    });

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
    setSujet("");
    setApprouvePar("");
    setHeuresAutorisees("");
    setHeuresRealisees("");
    setLignes([ligneDeveloppementVide()]);
    setDateRemise("");
    setSignature("");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Nouvelle fiche de développement"
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

          <div className="max-w-lg mb-6">
            <p className="text-base text-gray-600">
              À remplir pour chaque période autorisée d&apos;heures de
              développement.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-base font-semibold text-green-800 mb-1">
                Nom du(de la) formateur(trice)
              </label>
              <input
                type="text"
                value={nomFormateur}
                onChange={(e) => setNomFormateur(e.target.value)}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-green-800 mb-1">
                Sujet du développement
              </label>
              <textarea
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                rows={3}
                className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-green-800 mb-1">
                Approuvé par
              </label>
              <select
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
                  Nombre d&apos;heures autorisées
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={heuresAutorisees}
                  onChange={(e) => setHeuresAutorisees(e.target.value)}
                  className="w-full border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-green-800 mb-1">
                  Détail des heures réalisées à ce jour
                </label>
                <input
                  type="text"
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
                  Journée(s) travaillée(s)
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
                          value={ligne.date}
                          onChange={(e) =>
                            modifierLigne(index, "date", e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-base"
                        />
                      </td>
                      <td className="p-3">
                        <select
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
                Date de remise des travaux
              </label>
              <input
                type="date"
                value={dateRemise}
                onChange={(e) => setDateRemise(e.target.value)}
                className="border-2 border-green-200 focus:border-green-500 rounded-lg px-3 py-2.5 text-lg"
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Signature
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
              {enregistrement ? "Enregistrement..." : "Enregistrer la fiche"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

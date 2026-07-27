"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
import FicheTable from "@/components/FicheTable";
import {
  creerLignesVides,
  totalFormation,
  totalPratique,
} from "@/lib/fichePresence";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function Attendance() {
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [nomFormateur, setNomFormateur] = useState("");
  const [lignes, setLignes] = useState(creerLignesVides());
  const [motifHeures, setMotifHeures] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  const [signatureEtudiant, setSignatureEtudiant] = useState("");
  const [dateSignatureEtudiant, setDateSignatureEtudiant] = useState("");
  const [message, setMessage] = useState<{
    texte: string;
    type: "succes" | "erreur";
  } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [signatureEnregistree, setSignatureEnregistree] = useState<string | null>(
    null
  );
  const [matieresDisponibles, setMatieresDisponibles] = useState<string[]>([]);

  useEffect(() => {
    chargerSignatureEnregistree();
    chargerMatieresDisponibles();
  }, []);

  async function chargerMatieresDisponibles() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("matieres")
      .eq("id", user.id)
      .single();

    setMatieresDisponibles((data?.matieres as string[]) ?? []);
  }

  async function chargerSignatureEnregistree() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("signature_enregistree")
      .eq("id", user.id)
      .single();

    setSignatureEnregistree(data?.signature_enregistree ?? null);
  }

  async function memoriserSignature(signature: string) {
    await supabase.rpc("update_own_signature", {
      nouvelle_signature: signature,
    });
    setSignatureEnregistree(signature);
  }

  const totalF = totalFormation(lignes);
  const totalP = totalPratique(lignes);

  function modifierLigne(
    index: number,
    champ: keyof (typeof lignes)[number],
    valeur: string
  ) {
    setLignes((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l))
    );
  }

  async function enregistrerFiche() {
    setMessage(null);

    if (!nomEtudiant.trim()) {
      setMessage({ type: "erreur", texte: "Veuillez saisir le nom de l'étudiant." });
      return;
    }

    if (!confirmation) {
      setMessage({
        type: "erreur",
        texte:
          "Veuillez confirmer avoir vérifié l'exactitude des informations avant l'envoi.",
      });
      return;
    }

    if (!signatureEtudiant) {
      setMessage({
        type: "erreur",
        texte: "Veuillez enregistrer votre signature.",
      });
      return;
    }

    setEnregistrement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("attendance").insert({
      user_id: user?.id,
      nom_etudiant: nomEtudiant,
      nom_formateur: nomFormateur,
      lignes,
      total_formation: totalF,
      total_pratique: totalP,
      total_heures: totalF + totalP,
      motif_heures: motifHeures || null,
      confirmation,
      signature_etudiant: signatureEtudiant,
      date_signature_etudiant: dateSignatureEtudiant,
      statut: "en_attente",
    });

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    setMessage({
      type: "succes",
      texte: "Fiche enregistrée avec succès. Elle attend maintenant la validation du formateur.",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Nouvelle fiche de présence"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
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

          <div className="max-w-md mx-auto mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-wide text-center mb-5">
              FICHE DE PRÉSENCE
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <label className="font-semibold text-gray-900 w-44 shrink-0 text-right">
                  Nom de l&apos;étudiant(e) :
                </label>
                <input
                  type="text"
                  value={nomEtudiant}
                  onChange={(e) => setNomEtudiant(e.target.value)}
                  className="flex-1 bg-gray-100 border border-black rounded-sm px-2 py-1 text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="font-semibold text-gray-900 w-44 shrink-0 text-right">
                  Nom du formateur(trice) :
                </label>
                <input
                  type="text"
                  value={nomFormateur}
                  onChange={(e) => setNomFormateur(e.target.value)}
                  className="flex-1 bg-gray-100 border border-black rounded-sm px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border border-black p-3 text-sm italic text-gray-800 mb-6">
            Cette fiche devra être complétée et signée par l&apos;étudiant(e) et
            remise au formateur(trice) à la fin de la semaine ou à la fin de la
            matière. Cette fiche devra ensuite être acheminée et signée par le
            formateur(trice) à l&apos;administration au plus tard le lundi
            suivant la semaine en cours.
          </div>

          <div className="overflow-x-auto">
            <FicheTable
              lignes={lignes}
              editable
              onChange={modifierLigne}
              matieresDisponibles={matieresDisponibles}
            />
          </div>

          <div className="mt-6 border border-black">
            <div className="px-3 py-2 text-xs font-semibold text-center bg-[#c8c8c8] border-b border-black">
              SI PLUS OU MOINS D&apos;HEURES, INSCRIRE LE MOTIF
            </div>
            <textarea
              value={motifHeures}
              onChange={(e) => setMotifHeures(e.target.value)}
              rows={2}
              className="w-full p-2 text-sm bg-gray-100 outline-none"
            />
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-red-700">
            <input
              type="checkbox"
              checked={confirmation}
              onChange={(e) => setConfirmation(e.target.checked)}
              className="mt-1"
            />
            Je confirme avoir vérifié quotidiennement l&apos;exactitude des
            informations inscrites sur cette fiche de présence avant sa
            signature et son envoi.
          </label>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Signature de l&apos;étudiant(e)
            </h3>

            <SignaturePad
              onSave={(signature) => {
                setSignatureEtudiant(signature);
                setDateSignatureEtudiant(new Date().toISOString());
              }}
              nomParDefaut={nomEtudiant}
              signatureEnregistree={signatureEnregistree}
              onEnregistrerPreference={memoriserSignature}
            />

            {signatureEtudiant && (
              <p className="mt-2 text-sm text-green-700">
                Signature enregistrée, prête à être envoyée.
              </p>
            )}
          </div>

          <div className="mt-6 border border-dashed border-gray-300 rounded p-4 text-sm text-gray-500">
            Signature du formateur(trice) : sera ajoutée lors de la validation
            de cette fiche, dans le portail formateur.
          </div>

          {message && (
            <div
              className={`mt-6 text-sm rounded-lg px-4 py-3 border ${
                message.type === "erreur"
                  ? "bg-red-50 border-red-100 text-red-700"
                  : "bg-green-50 border-green-100 text-green-700"
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

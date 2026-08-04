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
  datesTravaillees,
} from "@/lib/fichePresence";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Formateur = { id: string; nom: string; matieres: string[] | null };

export default function Attendance() {
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [formateurId, setFormateurId] = useState("");
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
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
  const [enregistrementBrouillon, setEnregistrementBrouillon] = useState(false);
  const [signatureEnregistree, setSignatureEnregistree] = useState<string | null>(
    null
  );
  const [matieresDisponibles, setMatieresDisponibles] = useState<string[]>([]);

  // Id de la fiche "brouillon" en cours (celle que l'étudiant remplit jour
  // après jour, sans engagement, avant de la signer et de la soumettre).
  // null tant qu'aucune heure n'a encore été enregistrée cette semaine-ci.
  const [ficheId, setFicheId] = useState<number | null>(null);
  const [brouillonDepuis, setBrouillonDepuis] = useState<string | null>(null);

  useEffect(() => {
    chargerSignatureEnregistree();
    chargerMatieresDisponibles();
    chargerBrouillonExistant();
  }, []);

  async function chargerMatieresDisponibles() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profil } = await supabase
      .from("profiles")
      .select("matieres, formation_id")
      .eq("id", user.id)
      .single();

    let matieres: string[] = (profil?.matieres as string[]) ?? [];

    if (profil?.formation_id) {
      const { data: liees } = await supabase
        .from("formation_matieres")
        .select("matieres(nom)")
        .eq("formation_id", profil.formation_id);

      const noms = (liees ?? [])
        .map((row: any) => row.matieres?.nom)
        .filter(Boolean);

      if (noms.length > 0) matieres = noms;
    }

    setMatieresDisponibles(matieres);
    chargerFormateurs(matieres);
  }

  async function chargerFormateurs(matieres: string[]) {
    const { data } = await supabase.rpc("get_formateurs");
    const liste = (data as Formateur[]) ?? [];

    const filtres =
      matieres.length === 0
        ? liste
        : liste.filter((f) =>
            (f.matieres ?? []).some((m) => matieres.includes(m))
          );

    setFormateurs(filtres.length > 0 ? filtres : liste);
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

  // Reprend le brouillon le plus récent de l'étudiant, s'il en existe un —
  // pour qu'il puisse continuer à saisir ses heures là où il s'était arrêté
  // au lieu de repartir d'une fiche vide à chaque visite.
  async function chargerBrouillonExistant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("attendance")
      .select(
        "id, nom_etudiant, formateur_id, lignes, motif_heures, created_at"
      )
      .eq("user_id", user.id)
      .eq("statut", "brouillon")
      .is("supprime_le", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return;

    setFicheId(data.id);
    setNomEtudiant(data.nom_etudiant ?? "");
    setFormateurId(data.formateur_id ?? "");
    setLignes(
      Array.isArray(data.lignes) && data.lignes.length > 0
        ? data.lignes
        : creerLignesVides()
    );
    setMotifHeures(data.motif_heures ?? "");
    setBrouillonDepuis(data.created_at);
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

  // Enregistre les heures saisies jusqu'ici SANS exiger de confirmation ni
  // de signature — l'étudiant peut faire ça chaque jour de la semaine et y
  // revenir autant de fois qu'il veut avant de signer et soumettre.
  async function enregistrerBrouillon() {
    setMessage(null);

    if (!nomEtudiant.trim()) {
      setMessage({ type: "erreur", texte: "Veuillez saisir le nom de l'étudiant." });
      return;
    }

    setEnregistrementBrouillon(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const formateurChoisi = formateurs.find((f) => f.id === formateurId);

    const payload = {
      user_id: user?.id,
      nom_etudiant: nomEtudiant,
      nom_formateur: formateurChoisi?.nom ?? "",
      formateur_id: formateurId || null,
      lignes,
      total_formation: totalF,
      total_pratique: totalP,
      total_heures: totalF + totalP,
      motif_heures: motifHeures || null,
      statut: "brouillon",
    };

    if (ficheId) {
      const { error } = await supabase
        .from("attendance")
        .update(payload)
        .eq("id", ficheId);

      setEnregistrementBrouillon(false);

      if (error) {
        setMessage({ type: "erreur", texte: error.message });
        return;
      }
    } else {
      const { data: ficheCreee, error } = await supabase
        .from("attendance")
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
        "Heures enregistrées. Tu peux fermer la page et revenir n'importe quel jour pour continuer — rien n'est encore envoyé au formateur.",
    });
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const periodeNouvelle = datesTravaillees(lignes);

    if (user && periodeNouvelle) {
      const { data: fichesExistantes } = await supabase
        .from("attendance")
        .select("id, lignes, statut")
        .eq("user_id", user.id)
        .is("supprime_le", null)
        .neq("statut", "brouillon");

      const chevauchement = (fichesExistantes ?? [])
        .filter((f) => f.id !== ficheId)
        .find((f) => {
          const periode = datesTravaillees(f.lignes);
          if (!periode) return false;
          return (
            periodeNouvelle.debut <= periode.fin &&
            periodeNouvelle.fin >= periode.debut
          );
        });

      if (chevauchement) {
        const periode = datesTravaillees(chevauchement.lignes)!;
        const fmt = (d: Date) => d.toLocaleDateString("fr-CA");
        const continuer = window.confirm(
          `Attention : une fiche existe déjà pour la période du ${fmt(
            periode.debut
          )} au ${fmt(periode.fin)} (statut : ${chevauchement.statut}).\n\n` +
            `Cette nouvelle fiche chevauche cette période. Veux-tu quand même l'envoyer ?`
        );
        if (!continuer) {
          return;
        }
      }
    }

    setEnregistrement(true);

    const formateurChoisi = formateurs.find((f) => f.id === formateurId);

    const payload = {
      user_id: user?.id,
      nom_etudiant: nomEtudiant,
      nom_formateur: formateurChoisi?.nom ?? "",
      formateur_id: formateurId || null,
      lignes,
      total_formation: totalF,
      total_pratique: totalP,
      total_heures: totalF + totalP,
      motif_heures: motifHeures || null,
      confirmation,
      signature_etudiant: signatureEtudiant,
      date_signature_etudiant: dateSignatureEtudiant,
      statut: "en_attente",
    };

    const { data: ficheCreee, error } = ficheId
      ? await supabase
          .from("attendance")
          .update(payload)
          .eq("id", ficheId)
          .select("id")
          .single()
      : await supabase
          .from("attendance")
          .insert(payload)
          .select("id")
          .single();

    setEnregistrement(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    let avertissementNotification = "";
    if (ficheCreee?.id) {
      const notifOk = await notifier(ficheCreee.id, "creee");
      if (!notifOk) {
        avertissementNotification =
          " Le courriel d'avis au formateur n'a pas pu être envoyé — pense à le prévenir autrement.";
      }
    }

    setMessage({
      type: "succes",
      texte:
        "Fiche enregistrée avec succès. Elle attend maintenant la validation du formateur." +
        avertissementNotification,
    });

    // On repart sur une fiche vide pour la prochaine semaine : la fiche qui
    // vient d'être soumise n'est plus un brouillon, donc on ne veut plus la
    // recharger automatiquement à la prochaine visite.
    setFicheId(null);
    setBrouillonDepuis(null);
    setLignes(creerLignesVides());
    setMotifHeures("");
    setConfirmation(false);
    setSignatureEtudiant("");
    setDateSignatureEtudiant("");
  }

  // Renvoie true si le courriel de notification a bien été envoyé (ou
  // volontairement ignoré, ex. aucun formateur assigné), false en cas
  // d'échec réel — pour pouvoir avertir l'utilisateur sans jamais bloquer
  // l'enregistrement de la fiche elle-même.
  async function notifier(
    ficheId: number,
    type: "creee" | "validee" | "refusee"
  ): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const reponse = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ ficheId, type }),
      });

      const resultat = await reponse.json().catch(() => null);
      return Boolean(resultat?.success);
    } catch {
      return false;
    }
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
                <select
                  value={formateurId}
                  onChange={(e) => setFormateurId(e.target.value)}
                  className="flex-1 bg-gray-100 border border-black rounded-sm px-2 py-1 text-sm"
                >
                  <option value="">Choisir un formateur</option>
                  {formateurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {brouillonDepuis && (
            <div className="border border-blue-200 bg-blue-50 text-blue-800 text-sm rounded p-3 mb-6">
              Brouillon en cours depuis le{" "}
              {new Date(brouillonDepuis).toLocaleDateString("fr-CA")}. Continue à
              entrer tes heures chaque jour, puis signe et soumets la fiche
              quand elle est complète.
            </div>
          )}

          <div className="border border-black p-3 text-sm italic text-gray-800 mb-6">
            Entre tes heures et clique sur « Enregistrer mes heures » chaque
            jour de la semaine — rien n&apos;est envoyé au formateur(trice) à
            cette étape, tu peux revenir modifier la fiche autant de fois que
            nécessaire. Une fois la semaine complétée (le vendredi ou plus
            tard), signe la fiche et clique sur « Signer et soumettre » pour
            l&apos;envoyer au formateur(trice) et à l&apos;administration.
          </div>

          <div className="overflow-x-auto">
            <FicheTable
              lignes={lignes}
              editable
              onChange={modifierLigne}
              matieresDisponibles={matieresDisponibles}
            />
          </div>

          <div className="mt-4">
            <Button
              onClick={enregistrerBrouillon}
              disabled={enregistrementBrouillon}
            >
              {enregistrementBrouillon
                ? "Enregistrement..."
                : "Enregistrer mes heures"}
            </Button>
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

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Étape finale — signer et soumettre la fiche complète
            </h3>

            <label className="flex items-start gap-2 text-sm text-red-700">
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

            <div className="mt-6">
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

              <p className="mt-3 text-xs text-gray-400">
                En signant, tu consens à la collecte et à la conservation de
                ta signature électronique aux fins de validation de cette
                fiche de présence. Voir notre{" "}
                <a
                  href="/confidentialite"
                  target="_blank"
                  className="underline hover:text-gray-600"
                >
                  politique de confidentialité
                </a>
                .
              </p>
            </div>

            <div className="mt-6 border border-dashed border-gray-300 rounded p-4 text-sm text-gray-500">
              Signature du formateur(trice) : sera ajoutée lors de la
              validation de cette fiche, dans le portail formateur.
            </div>

            <div className="mt-6">
              <Button onClick={enregistrerFiche} disabled={enregistrement}>
                {enregistrement ? "Envoi..." : "Signer et soumettre"}
              </Button>
            </div>
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
        </Card>
      </div>
    </div>
  );
}

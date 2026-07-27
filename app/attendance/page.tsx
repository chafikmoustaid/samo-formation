"use client";
import { supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function Attendance() {
  const [nomEtudiant, setNomEtudiant] = useState("");
  const [nomFormateur, setNomFormateur] = useState("");
  const [matiere, setMatiere] = useState("");

  const [semaineDebut, setSemaineDebut] = useState("");
  const [semaineFin, setSemaineFin] = useState("");

  const [lundiDebut, setLundiDebut] = useState("");
  const [lundiFin, setLundiFin] = useState("");

  const [mardiDebut, setMardiDebut] = useState("");
  const [mardiFin, setMardiFin] = useState("");

  const [mercrediDebut, setMercrediDebut] = useState("");
  const [mercrediFin, setMercrediFin] = useState("");

  const [jeudiDebut, setJeudiDebut] = useState("");
  const [jeudiFin, setJeudiFin] = useState("");

  const [vendrediDebut, setVendrediDebut] = useState("");
  const [vendrediFin, setVendrediFin] = useState("");
const [signatureEtudiant, setSignatureEtudiant] =
  useState("");
const [message, setMessage] = useState("");

const [
  dateSignatureEtudiant,
  setDateSignatureEtudiant,
] = useState("");

const [signatureFormateur, setSignatureFormateur] =
  useState("");

const [
  dateSignatureFormateur,
  setDateSignatureFormateur,
] = useState("");

  const calculHeures = (
    debut: string,
    fin: string
  ) => {
    if (!debut || !fin) return 0;

    const [hd, md] = debut.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);

    const minutes =
      hf * 60 +
      mf -
      (hd * 60 + md);

    return Math.max(
      0,
      Number((minutes / 60).toFixed(2))
    );
  };

  const total =
    calculHeures(lundiDebut, lundiFin) +
    calculHeures(mardiDebut, mardiFin) +
    calculHeures(mercrediDebut, mercrediFin) +
    calculHeures(jeudiDebut, jeudiFin) +
    calculHeures(vendrediDebut, vendrediFin);
async function enregistrerFiche() {
  setMessage("");

  if (!nomEtudiant.trim()) {
    alert("Veuillez saisir le nom de l'étudiant.");
    return;
  }

  if (!signatureEtudiant) {
    alert(
      "Veuillez enregistrer la signature de l'étudiant."
    );
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance")
    .insert({
      user_id: user?.id,
      nom_etudiant: nomEtudiant,
      nom_formateur: nomFormateur,
      matiere,

      semaine_debut: semaineDebut,
      semaine_fin: semaineFin,

      lundi: calculHeures(
        lundiDebut,
        lundiFin
      ),

      mardi: calculHeures(
        mardiDebut,
        mardiFin
      ),

      mercredi: calculHeures(
        mercrediDebut,
        mercrediFin
      ),

      jeudi: calculHeures(
        jeudiDebut,
        jeudiFin
      ),

      vendredi: calculHeures(
        vendrediDebut,
        vendrediFin
      ),

      total_heures: total,

      signature_etudiant:
        signatureEtudiant,

date_signature_etudiant:
  dateSignatureEtudiant,

signature_formateur:
  signatureFormateur,

date_signature_formateur:
  dateSignatureFormateur,

statut: "en_attente",    });

  if (error) {
console.log("ERREUR COMPLETE:", error);
alert(JSON.stringify(error, null, 2));
    return;
  }

  setMessage(
    "✅ Fiche enregistrée avec succès."
  );
}
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Fiche de présence SAMO"
          subtitle="Technique Support Informatique"
          backHref="/dashboard"
          backLabel="← Retour au tableau de bord"
        />

        <Card>

          <div className="grid md:grid-cols-2 gap-6 mb-10">

            <div>
              <label className="block font-semibold mb-2">
                Nom de l'étudiant
              </label>

              <input
                type="text"
                value={nomEtudiant}
                onChange={(e) =>
                  setNomEtudiant(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Nom du formateur
              </label>

              <input
                type="text"
                value={nomFormateur}
                onChange={(e) =>
                  setNomFormateur(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Matière
              </label>

              <input
                type="text"
                value={matiere}
                onChange={(e) =>
                  setMatiere(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Semaine du
              </label>

              <input
                type="date"
                value={semaineDebut}
                onChange={(e) =>
                  setSemaineDebut(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">
                Au
              </label>

              <input
                type="date"
                value={semaineFin}
                onChange={(e) =>
                  setSemaineFin(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

          </div>

          <h2 className="text-3xl font-bold mb-6">
            Présences hebdomadaires
          </h2>

          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="border p-3">
                  Jour
                </th>
                <th className="border p-3">
                  Début
                </th>
                <th className="border p-3">
                  Fin
                </th>
                <th className="border p-3">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <td className="border p-3">
                  Lundi
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={lundiDebut}
                    onChange={(e) =>
                      setLundiDebut(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={lundiFin}
                    onChange={(e) =>
                      setLundiFin(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3 text-center">
                  {calculHeures(
                    lundiDebut,
                    lundiFin
                  )} h
                </td>
              </tr>

              <tr>
                <td className="border p-3">
                  Mardi
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={mardiDebut}
                    onChange={(e) =>
                      setMardiDebut(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={mardiFin}
                    onChange={(e) =>
                      setMardiFin(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3 text-center">
                  {calculHeures(
                    mardiDebut,
                    mardiFin
                  )} h
                </td>
              </tr>

              <tr>
                <td className="border p-3">
                  Mercredi
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={mercrediDebut}
                    onChange={(e) =>
                      setMercrediDebut(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={mercrediFin}
                    onChange={(e) =>
                      setMercrediFin(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3 text-center">
                  {calculHeures(
                    mercrediDebut,
                    mercrediFin
                  )} h
                </td>
              </tr>

              <tr>
                <td className="border p-3">
                  Jeudi
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={jeudiDebut}
                    onChange={(e) =>
                      setJeudiDebut(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={jeudiFin}
                    onChange={(e) =>
                      setJeudiFin(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3 text-center">
                  {calculHeures(
                    jeudiDebut,
                    jeudiFin
                  )} h
                </td>
              </tr>

              <tr>
                <td className="border p-3">
                  Vendredi
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={vendrediDebut}
                    onChange={(e) =>
                      setVendrediDebut(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3">
                  <input
                    type="time"
                    value={vendrediFin}
                    onChange={(e) =>
                      setVendrediFin(
                        e.target.value
                      )
                    }
                    className="border rounded p-2"
                  />
                </td>

                <td className="border p-3 text-center">
                  {calculHeures(
                    vendrediDebut,
                    vendrediFin
                  )} h
                </td>
              </tr>

            </tbody>
          </table>

       <div className="mt-8 bg-green-50 border border-green-300 rounded-lg p-5">
  <h3 className="text-2xl font-bold text-green-700">
    Total semaine : {total.toFixed(2)} heures
  </h3>
</div>

<div className="mt-10">

  <h2 className="text-2xl font-bold mb-4">
    Signature de l'étudiant
  </h2>

  <SignaturePad
    onSave={(signature) => {
      setSignatureEtudiant(signature);

      setDateSignatureEtudiant(
        new Date().toISOString()
      );
    }}
  />

  {signatureEtudiant && (
    <div className="mt-6 border-2 border-green-200 rounded-lg bg-white p-6">

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Signature numérique enregistrée
      </h3>

      <div className="space-y-2 text-sm text-gray-700">

        <div>
          <strong>Étudiant :</strong>{" "}
          {nomEtudiant || "Non renseigné"}
        </div>

        <div>
          <strong>Date :</strong>{" "}
          {dateSignatureEtudiant &&
  new Date(
    dateSignatureEtudiant
  ).toLocaleString("fr-CA")}
        </div>

      </div>

    </div>
  )}
<div className="mt-8">
  <Button onClick={enregistrerFiche}>
    Enregistrer la fiche
  </Button>
</div>

<div className="mt-12">

  <h2 className="text-2xl font-bold mb-4">
    Signature du formateur
  </h2>

  <SignaturePad
    onSave={(signature) => {

      if (!nomFormateur.trim()) {
        alert(
          "Veuillez saisir le nom du formateur avant de signer."
        );
        return;
      }

      setSignatureFormateur(signature);

      setDateSignatureFormateur(
        new Date().toISOString()
      );
    }}
  />

  {signatureFormateur && (
    <div className="mt-6 border-2 border-blue-300 rounded-lg bg-white p-6">

      <h3 className="text-xl font-bold mb-4">
        Signature formateur enregistrée
      </h3>

      <div className="space-y-2">

        <div>
          <strong>Formateur :</strong>{" "}
          {nomFormateur}
        </div>

        <div>
          <strong>Date :</strong>{" "}
          {new Date(
            dateSignatureFormateur
          ).toLocaleString("fr-CA")}
        </div>

      </div>

    </div>
  )}

</div>

{message && (
  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
    {message}
  </div>
)}

</div>

        </Card>
      </div>
    </div>
  );
}
"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";

const ETAPES = [
  "Dans l'équipe (dossier étudiants)",
  "Dans « Partagé »",
  "Créez un dossier avec Nom complet de l'étudiant – Titre du cours",
  "Déposez les dossiers/documents dans le dossier",
];

export default function RemiseDossierPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Dossier de formation"
          subtitle="Remise du dossier dans Teams — rappel de la procédure."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-6 border-2 border-green-200 bg-green-50">
          <p className="text-sm font-semibold text-green-800">
            Important : le dossier doit être déposé dans Teams, dans le
            dossier « étudiant », au plus tard 5 jours après la fin du
            dernier cours — 1 dossier par formation.
          </p>
          <p className="text-sm text-green-800 mt-2">
            Pourquoi ? Pour prévenir la perte des dossiers. Avec un grand
            nombre d&apos;étudiants et une vérification requise pour chaque
            dossier, un dépôt rapide assure un traitement fluide.
          </p>
        </Card>

        <Card className="mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">Étapes</h3>
          <ol className="space-y-2 text-sm text-gray-800 list-decimal list-inside">
            {ETAPES.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </Card>

        <Card>
          <h3 className="text-base font-bold text-gray-900 mb-3">
            Ce que devrait contenir le dossier
          </h3>
          <ul className="space-y-1.5 text-sm text-gray-800 list-disc list-inside">
            <li>
              <span className="font-semibold">Évaluation finale</span> — le nom, prénom, la date et la
              note doivent obligatoirement s&apos;y trouver.
            </li>
            <li>
              <span className="font-semibold">Évaluation</span> — examen de chapitre noté (mêmes exigences
              que ci-dessus).
            </li>
            <li>
              <span className="font-semibold">Exercice</span> — pratique non notée.
            </li>
            <li>
              <span className="font-semibold">Pratique maison</span> — exercice que l&apos;étudiant fait en
              dehors des cours.
            </li>
          </ul>

          <div className="mt-5 border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              À vérifier avant l&apos;envoi — les 4 documents du dossier :
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-md text-white" style={{ backgroundColor: "#335693" }}>
                1-RELEVÉ DE NOTE
              </span>
              <span className="px-3 py-1.5 rounded-md text-white" style={{ backgroundColor: "#335693" }}>
                2-PAGE DE NOTE
              </span>
              <span className="px-3 py-1.5 rounded-md text-gray-800" style={{ backgroundColor: "#8FAADC" }}>
                3-feuille de route
              </span>
              <span className="px-3 py-1.5 rounded-md text-white" style={{ backgroundColor: "#335693" }}>
                4-Compte rendu
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

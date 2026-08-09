"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";

export default function InfoDossierPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Dossier de formation"
          subtitle="Info — rappels importants."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <Card className="mb-6 border-2 border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-700">
            Les informations (étudiant, cours, formateur) sont maintenant
            reprises automatiquement sur les feuilles de route, la page de
            note, le relevé de notes et le compte rendu dès que vous
            sélectionnez l&apos;étudiant — vous n&apos;avez plus besoin de les
            ressaisir ni de dupliquer de fichier.
          </p>
        </Card>

        <Card className="mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-2">
            Formulaire d&apos;évaluation hebdomadaire de l&apos;étudiant
          </h3>
          <p className="text-sm text-gray-700 mb-1">
            Doit être complété par le formateur.
          </p>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
            <li>À compléter une fois par semaine, tous les vendredis.</li>
            <li>Décrit la progression de l&apos;étudiant au fur et à mesure que la formation avance.</li>
            <li>Une fois complété et soumis, le formulaire est envoyé directement par courriel à la direction.</li>
          </ul>
          <a
            href="https://forms.office.com/pages/responsepage.aspx?id=0UteQ8dpuUmMrs27f-QrrXvQAueRk5dAkIvQj_F3_OtUMzY4UkkxUkREWFlWNlBFSFZUWThITUpUVS4u&route=shorturl"
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Ouvrir le formulaire d&apos;évaluation hebdomadaire →
          </a>
          <p className="text-xs text-gray-500 mt-2">
            Un formulaire distinct par étudiant.
          </p>
        </Card>
      </div>
    </div>
  );
}

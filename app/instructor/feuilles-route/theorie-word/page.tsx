"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DossierTabs from "@/components/instructor/DossierTabs";
import { CHAPITRES_THEORIE_WORD } from "./data";

export default function TheorieWordPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Dossier de formation"
          subtitle="Théorie Word — référence des chapitres, à utiliser pour remplir « Théorie donnée »."
          backHref="/instructor"
          backLabel="← Retour au portail formateur"
        />

        <DossierTabs />

        <div className="space-y-4">
          {CHAPITRES_THEORIE_WORD.map((ch) => (
            <Card key={ch.titre}>
              <h3 className="text-base font-bold text-[#2E4E6B] mb-3">{ch.titre}</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Théorie</p>
                  <ul className="space-y-1 text-sm text-gray-800 list-disc list-inside">
                    {ch.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Exercices et pratiques
                  </p>
                  {ch.exercices.length === 0 ? (
                    <p className="text-sm text-gray-400">—</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-gray-800 list-disc list-inside">
                      {ch.exercices.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

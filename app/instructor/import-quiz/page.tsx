"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ImportQuizPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Importation de quiz"
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <Card>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz étudiant (.docx)
            </label>
            <input type="file" className="text-sm" />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Corrigé (.docx)
            </label>
            <input type="file" className="text-sm" />
          </div>

          <Button>Importer</Button>
        </Card>
      </div>
    </div>
  );
}

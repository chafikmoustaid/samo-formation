"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AttendanceDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [fiche, setFiche] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) chargerFiche();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chargerFiche() {
    setLoading(true);

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single();

    setFiche(data ?? null);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (!fiche) {
    return (
      <div className="p-8">
        Fiche introuvable
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Fiche de présence
        </h1>

        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <strong>Étudiant :</strong>{" "}
            {fiche.nom_etudiant}
          </div>

          <div>
            <strong>Formateur :</strong>{" "}
            {fiche.nom_formateur}
          </div>

          <div>
            <strong>Matière :</strong>{" "}
            {fiche.matiere}
          </div>

          <div>
            <strong>Total :</strong>{" "}
            {fiche.total_heures} h
          </div>

          <div>
            <strong>Semaine du :</strong>{" "}
            {String(fiche.semaine_debut)}
          </div>

          <div>
            <strong>Au :</strong>{" "}
            {String(fiche.semaine_fin)}
          </div>

        </div>

        <div className="mt-10">

          <h2 className="text-2xl font-bold mb-4">
            Heures
          </h2>

          <ul className="space-y-2">
            <li>Lundi : {fiche.lundi} h</li>
            <li>Mardi : {fiche.mardi} h</li>
            <li>Mercredi : {fiche.mercredi} h</li>
            <li>Jeudi : {fiche.jeudi} h</li>
            <li>Vendredi : {fiche.vendredi} h</li>
          </ul>

        </div>

        <div className="mt-10 border rounded-lg p-6">

          <h2 className="text-2xl font-bold mb-4">
            Signature étudiant
          </h2>

          <div>
            <strong>Signature enregistrée :</strong>{" "}
            {fiche.signature_etudiant ? "Oui" : "Non"}
          </div>

          <div className="mt-2">
            <strong>Date :</strong>{" "}
            {fiche.date_signature_etudiant
              ? new Date(
                  fiche.date_signature_etudiant
                ).toLocaleString("fr-CA")
              : "-"}
          </div>

        </div>

        <div className="mt-10 border rounded-lg p-6">

          <h2 className="text-2xl font-bold mb-4">
            Signature formateur
          </h2>

          <div>
            <strong>Signature enregistrée :</strong>{" "}
            {fiche.signature_formateur ? "Oui" : "Non"}
          </div>

          <div className="mt-2">
            <strong>Date :</strong>{" "}
            {fiche.date_signature_formateur
              ? new Date(
                  fiche.date_signature_formateur
                ).toLocaleString("fr-CA")
              : "-"}
          </div>

        </div>

        <div className="mt-10">
          <p className="text-gray-600">
            PDF à venir
          </p>
        </div>

      </div>

    </div>
  );
}

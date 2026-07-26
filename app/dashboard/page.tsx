"use client";

import { useEffect, useState } from "react";
import DashboardChart from "@/components/DashboardChart";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerFiches();
  }, []);

  async function chargerFiches() {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("id", { ascending: false });

    setFiches(data ?? []);
    setLoading(false);
  }

  const totalFiches = fiches.length;

  const enAttente = fiches.filter(
    (f) => f.statut === "en_attente"
  ).length;

  const validees = fiches.filter(
    (f) => f.statut === "validee"
  ).length;

  const refusees = fiches.filter(
    (f) => f.statut === "refusee"
  ).length;

  const totalHeures = fiches.reduce(
    (total, fiche) => total + Number(fiche.total_heures || 0),
    0
  );

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Tableau de bord SAMO
        </h1>

        <div className="flex gap-4 mb-8">

          <Link
            href="/attendance"
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
          >
            Nouvelle fiche
          </Link>

          <Link
            href="/attendance/history"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            Historique
          </Link>

          <Link
            href="/dashboard/comptes"
            className="bg-gray-700 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800"
          >
            Gestion des comptes
          </Link>

        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">

          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-gray-500">
              Total fiches
            </div>

            <div className="text-4xl font-bold mt-2">
              {totalFiches}
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl shadow p-6">
            <div className="text-yellow-700">
              En attente
            </div>

            <div className="text-4xl font-bold mt-2">
              {enAttente}
            </div>
          </div>

          <div className="bg-green-50 rounded-xl shadow p-6">
            <div className="text-green-700">
              Validées
            </div>

            <div className="text-4xl font-bold mt-2">
              {validees}
            </div>
          </div>

          <div className="bg-red-50 rounded-xl shadow p-6">
            <div className="text-red-700">
              Refusées
            </div>

            <div className="text-4xl font-bold mt-2">
              {refusees}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl shadow p-6">
            <div className="text-blue-700">
              Total heures
            </div>

            <div className="text-4xl font-bold mt-2">
              {totalHeures}
            </div>
          </div>

        </div>

        <div className="mt-10 bg-white rounded-xl shadow p-6">

          <h2 className="text-2xl font-bold mb-6">
            Répartition des statuts
          </h2>

          <DashboardChart
            enAttente={enAttente}
            validees={validees}
            refusees={refusees}
          />

        </div>

<div className="mt-10 bg-white rounded-xl shadow p-6">

  <h2 className="text-2xl font-bold mb-6">
    Dernières fiches
  </h2>

  <table className="w-full">

    <thead>
      <tr className="border-b">

        <th className="p-3 text-left">
          Étudiant
        </th>

        <th className="p-3 text-left">
          Formateur
        </th>

        <th className="p-3 text-left">
          Total
        </th>

        <th className="p-3 text-left">
          Statut
        </th>

      </tr>
    </thead>

    <tbody>

      {fiches.slice(0, 5).map((fiche) => (
        <tr
          key={fiche.id}
          className="border-b"
        >
          <td className="p-3">
            {fiche.nom_etudiant}
          </td>

          <td className="p-3">
            {fiche.nom_formateur}
          </td>

          <td className="p-3">
            {fiche.total_heures} h
          </td>

          <td className="p-3">
            {fiche.statut}
          </td>
        </tr>
      ))}

    </tbody>

  </table>

</div>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type Etudiant = {
  id: string;
  email: string;
  nom_complet: string | null;
  formation_id: number | null;
};

export default function InstructorStudentsPage() {
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [formationsParId, setFormationsParId] = useState<Map<number, string>>(
    new Map()
  );
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    const [{ data: students }, { data: formations }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, nom_complet, formation_id")
        .eq("role", "student")
        .order("nom_complet", { ascending: true }),
      supabase.from("formations").select("id, nom"),
    ]);

    setFormationsParId(new Map((formations ?? []).map((f) => [f.id, f.nom])));
    setEtudiants((students as Etudiant[]) ?? []);
    setLoading(false);
  }

  const etudiantsFiltres = etudiants.filter((e) => {
    if (!recherche.trim()) return true;
    const q = recherche.trim().toLowerCase();
    return `${e.email} ${e.nom_complet ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Mes étudiants"
          backHref="/instructor"
          backLabel="← Portail formateur"
        />

        <Card>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un étudiant par nom ou email…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
          />

          {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : etudiantsFiltres.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucun étudiant dans les formations qui te sont assignées.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {etudiantsFiltres.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/instructor/students/${e.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <div>
                      <span className="text-gray-900 font-medium">
                        {e.nom_complet || e.email}
                      </span>
                      {e.nom_complet && (
                        <span className="text-gray-400 ml-2">{e.email}</span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {e.formation_id
                        ? formationsParId.get(e.formation_id) ?? "Formation inconnue"
                        : "Aucune formation"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

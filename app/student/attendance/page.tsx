"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";
import Badge from "@/components/ui/Badge";

const STATUT_TONE = {
  en_attente: "warning",
  validee: "success",
  refusee: "danger",
} as const;

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  validee: "Validée",
  refusee: "Refusée",
};

export default function StudentAttendancePage() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerFiches();
  }, []);

  async function chargerFiches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .is("supprime_le", null)
      .order("id", { ascending: false });

    setFiches(data ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Mes fiches de présence"
          action={
            <LinkButton href="/attendance" variant="primary" size="sm">
              + Nouvelle fiche
            </LinkButton>
          }
        />

        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-gray-400">Chargement...</div>
          ) : fiches.length === 0 ? (
            <div className="p-8 text-gray-500 text-sm">
              Tu n&apos;as encore soumis aucune fiche de présence.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="p-4 font-medium">Formation</th>
                  <th className="p-4 font-medium">Pratique</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4"></th>
                </tr>
              </thead>

              <tbody>
                {fiches.map((fiche) => (
                  <tr key={fiche.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4">{fiche.total_formation ?? 0} h</td>
                    <td className="p-4">{fiche.total_pratique ?? 0} h</td>
                    <td className="p-4">{fiche.total_heures} h</td>
                    <td className="p-4">
                      <Badge
                        tone={
                          STATUT_TONE[
                            fiche.statut as keyof typeof STATUT_TONE
                          ] ?? "neutral"
                        }
                      >
                        {STATUT_LABEL[fiche.statut] ?? fiche.statut}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/attendance/${fiche.id}`}
                        className="text-green-700 hover:underline text-sm"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Réplique la barre d'onglets du classeur Excel "FEUILLE DE ROUTE" fourni
// par la direction : mêmes libellés (numérotation incluse) et mêmes
// couleurs que les onglets du fichier (couleurs extraites du .xlsm).
const ONGLETS = [
  { href: "/instructor/feuilles-route/remise-dossier", label: "Remise du dossier dans Teams", bg: "#74BC4C", text: "#FFFFFF" },
  { href: "/instructor/feuilles-route/info", label: "Info", bg: "#FF0000", text: "#FFFFFF" },
  { href: "/instructor/weekly-evaluation", label: "ÉVALUATION HEBDOMADAIRE", bg: "#DC2626", text: "#FFFFFF", dashboardHref: "/dashboard/weekly-evaluations" },
  { href: "/instructor/feuilles-route/releve-de-notes", label: "1-RELEVÉ DE NOTE", bg: "#335693", text: "#FFFFFF", dashboardHref: "/dashboard/feuilles-route/releve-de-notes" },
  { href: "/instructor/feuilles-route/page-de-note", label: "2-PAGE DE NOTE", bg: "#335693", text: "#FFFFFF", dashboardHref: "/dashboard/feuilles-route/page-de-note" },
  { href: "/instructor/feuilles-route/theorie-word", label: "THÉORIE  WORD", bg: "#2E4E6B", text: "#FFFFFF" },
  { href: "/instructor/feuilles-route", label: "3-feuille de route", bg: "#8FAADC", text: "#1F2937", dashboardHref: "/dashboard/feuilles-route" },
  { href: "/instructor/feuilles-route/compte-rendu", label: "4-Compte rendu", bg: "#335693", text: "#FFFFFF", dashboardHref: "/dashboard/feuilles-route/compte-rendu" },
];

export default function DossierTabs({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {ONGLETS.map((o) => {
        const href = admin && o.dashboardHref ? o.dashboardHref : o.href;
        const actif = pathname === href;
        return (
          <Link
            key={o.label}
            href={href}
            style={{ backgroundColor: o.bg, color: o.text }}
            className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5 ${
              actif ? "ring-2 ring-offset-2 ring-gray-800" : "opacity-90 hover:opacity-100"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

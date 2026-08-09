"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/instructor/feuilles-route", label: "Feuilles de route" },
  { href: "/instructor/feuilles-route/page-de-note", label: "Page de note" },
  { href: "/instructor/feuilles-route/releve-de-notes", label: "Relevé de notes" },
  { href: "/instructor/feuilles-route/compte-rendu", label: "Compte rendu" },
];

export default function DossierTabs({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const base = admin ? "/dashboard/feuilles-route" : "/instructor/feuilles-route";
  const onglets = admin
    ? ONGLETS.map((o) => ({ ...o, href: o.href.replace("/instructor/feuilles-route", base) }))
    : ONGLETS;

  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-1">
      {onglets.map((o) => {
        const actif = pathname === o.href;
        return (
          <Link
            key={o.href}
            href={o.href}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              actif
                ? "bg-green-700 text-white"
                : "text-green-800 hover:bg-green-50"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

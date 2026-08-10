"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

// Sélecteur simple (une seule valeur) façon <select>, mais avec un champ de
// recherche en haut du panneau déroulant pour filtrer les options dès la
// première lettre tapée — utile quand la liste est longue (ex. : des
// centaines d'étudiants).
export default function SelectRecherche({
  value,
  onChange,
  options,
  optionTous,
  placeholderRecherche = "Rechercher…",
  className = "",
}: {
  value: string;
  onChange: (valeur: string) => void;
  options: Option[];
  optionTous: string;
  placeholderRecherche?: string;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const conteneurRef = useRef<HTMLDivElement>(null);
  const rechercheRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
        setRecherche("");
      }
    }
    if (ouvert) document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  useEffect(() => {
    if (ouvert) rechercheRef.current?.focus();
  }, [ouvert]);

  const rechercheNormalisee = recherche.trim().toLowerCase();
  const optionsFiltrees = rechercheNormalisee
    ? options.filter((o) => o.label.toLowerCase().includes(rechercheNormalisee))
    : options;

  const libelle = options.find((o) => o.value === value)?.label ?? optionTous;

  function choisir(valeur: string) {
    onChange(valeur);
    setOuvert(false);
    setRecherche("");
  }

  return (
    <div className={`relative ${className}`} ref={conteneurRef}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left"
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>{libelle}</span>
        <span className="text-gray-400 shrink-0">▾</span>
      </button>

      {ouvert && (
        <div className="absolute z-20 mt-1 w-64 max-h-72 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
          <input
            ref={rechercheRef}
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={placeholderRecherche}
            className="border-b border-gray-200 px-3 py-2 text-sm outline-none"
          />
          <div className="overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => choisir("")}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 ${
                value === "" ? "font-semibold text-green-700" : "text-gray-700"
              }`}
            >
              {optionTous}
            </button>
            {optionsFiltrees.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">Aucun résultat.</p>
            ) : (
              optionsFiltrees.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => choisir(o.value)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 truncate ${
                    value === o.value ? "font-semibold text-green-700" : "text-gray-700"
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

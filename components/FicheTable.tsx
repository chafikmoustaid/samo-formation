"use client";

import { calculHeures, LigneFiche } from "@/lib/fichePresence";

export default function FicheTable({
  lignes,
  editable = false,
  onChange,
}: {
  lignes: LigneFiche[];
  editable?: boolean;
  onChange?: (index: number, field: keyof LigneFiche, value: string) => void;
}) {
  const totalFormation = lignes.reduce(
    (sum, l) => sum + calculHeures(l.formationDe, l.formationA),
    0
  );

  const totalPratique = lignes.reduce(
    (sum, l) => sum + calculHeures(l.pratiqueDe, l.pratiqueA),
    0
  );

  function set(index: number, field: keyof LigneFiche, value: string) {
    onChange?.(index, field, value);
  }

  return (
    <table className="w-full border border-gray-300 text-sm">
      <thead>
        <tr className="bg-gray-100 text-gray-700">
          <th rowSpan={2} className="border border-gray-300 p-2 w-16">
            Date
          </th>
          <th rowSpan={2} className="border border-gray-300 p-2">
            Matières
          </th>
          <th rowSpan={2} className="border border-gray-300 p-2 w-10">
            L/P
          </th>
          <th colSpan={3} className="border border-gray-300 p-2">
            Formation
          </th>
          <th colSpan={3} className="border border-gray-300 p-2">
            Pratique
          </th>
        </tr>
        <tr className="bg-gray-100 text-gray-700">
          <th className="border border-gray-300 p-1.5 w-16">De</th>
          <th className="border border-gray-300 p-1.5 w-16">À</th>
          <th className="border border-gray-300 p-1.5 w-16">Total</th>
          <th className="border border-gray-300 p-1.5 w-16">De</th>
          <th className="border border-gray-300 p-1.5 w-16">À</th>
          <th className="border border-gray-300 p-1.5 w-16">Total</th>
        </tr>
      </thead>

      <tbody>
        {lignes.map((ligne, index) => {
          const formationTotal = calculHeures(ligne.formationDe, ligne.formationA);
          const pratiqueTotal = calculHeures(ligne.pratiqueDe, ligne.pratiqueA);
          const premiereLigneDuJour = ligne.type === "P";

          return (
            <tr key={index}>
              {premiereLigneDuJour && (
                <td
                  rowSpan={2}
                  className="border border-gray-300 p-2 font-medium text-center align-middle bg-gray-50"
                >
                  {ligne.jour}
                </td>
              )}

              <td className="border border-gray-300 p-1">
                {editable ? (
                  <input
                    type="text"
                    value={ligne.matiere}
                    onChange={(e) => set(index, "matiere", e.target.value)}
                    placeholder="Matière / date"
                    className="w-full px-1.5 py-1 text-sm outline-none"
                  />
                ) : (
                  <span className="px-1.5">{ligne.matiere || "—"}</span>
                )}
              </td>

              <td className="border border-gray-300 p-1.5 text-center">
                {ligne.type}
              </td>

              <td className="border border-gray-300 p-0.5">
                {editable ? (
                  <input
                    type="number"
                    step="0.5"
                    value={ligne.formationDe}
                    onChange={(e) => set(index, "formationDe", e.target.value)}
                    className="w-full px-1 py-1 text-sm text-center outline-none"
                  />
                ) : (
                  <span className="block text-center">{ligne.formationDe || ""}</span>
                )}
              </td>
              <td className="border border-gray-300 p-0.5">
                {editable ? (
                  <input
                    type="number"
                    step="0.5"
                    value={ligne.formationA}
                    onChange={(e) => set(index, "formationA", e.target.value)}
                    className="w-full px-1 py-1 text-sm text-center outline-none"
                  />
                ) : (
                  <span className="block text-center">{ligne.formationA || ""}</span>
                )}
              </td>
              <td className="border border-gray-300 p-1.5 text-center bg-gray-50">
                {formationTotal || ""}
              </td>

              <td className="border border-gray-300 p-0.5">
                {editable ? (
                  <input
                    type="number"
                    step="0.5"
                    value={ligne.pratiqueDe}
                    onChange={(e) => set(index, "pratiqueDe", e.target.value)}
                    className="w-full px-1 py-1 text-sm text-center outline-none"
                  />
                ) : (
                  <span className="block text-center">{ligne.pratiqueDe || ""}</span>
                )}
              </td>
              <td className="border border-gray-300 p-0.5">
                {editable ? (
                  <input
                    type="number"
                    step="0.5"
                    value={ligne.pratiqueA}
                    onChange={(e) => set(index, "pratiqueA", e.target.value)}
                    className="w-full px-1 py-1 text-sm text-center outline-none"
                  />
                ) : (
                  <span className="block text-center">{ligne.pratiqueA || ""}</span>
                )}
              </td>
              <td className="border border-gray-300 p-1.5 text-center bg-gray-50">
                {pratiqueTotal || ""}
              </td>
            </tr>
          );
        })}

        <tr className="bg-gray-100 font-semibold">
          <td colSpan={3} className="border border-gray-300 p-2 text-center">
            TOTAL
          </td>
          <td colSpan={2} className="border border-gray-300"></td>
          <td className="border border-gray-300 p-2 text-center">
            {totalFormation.toFixed(2)}
          </td>
          <td colSpan={2} className="border border-gray-300"></td>
          <td className="border border-gray-300 p-2 text-center">
            {totalPratique.toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

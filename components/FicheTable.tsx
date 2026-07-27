"use client";

import { calculHeures, LigneFiche, OPTIONS_HEURES } from "@/lib/fichePresence";

function SelectHeure({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-0.5 py-1.5 text-xs outline-none bg-transparent"
    >
      <option value=""></option>
      {OPTIONS_HEURES.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

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

  function heureLabel(value: string) {
    return OPTIONS_HEURES.find((o) => o.value === value)?.label ?? value;
  }

  return (
    <table
      className="border border-black text-sm text-gray-900"
      style={{ tableLayout: "fixed", width: "1000px", minWidth: "100%" }}
    >
      <colgroup>
        <col style={{ width: "50px" }} />
        <col style={{ width: "110px" }} />
        <col />
        <col style={{ width: "36px" }} />
        <col style={{ width: "70px" }} />
        <col style={{ width: "70px" }} />
        <col style={{ width: "60px" }} />
        <col style={{ width: "70px" }} />
        <col style={{ width: "70px" }} />
        <col style={{ width: "60px" }} />
      </colgroup>

      <thead>
        <tr className="bg-[#c8c8c8] text-gray-900">
          <th rowSpan={2} className="border border-black p-2">
            Jour
          </th>
          <th rowSpan={2} className="border border-black p-2">
            Date
          </th>
          <th rowSpan={2} className="border border-black p-2">
            Matières
          </th>
          <th rowSpan={2} className="border border-black p-2">
            L/P
          </th>
          <th colSpan={3} className="border border-black p-2">
            Formation
          </th>
          <th colSpan={3} className="border border-black p-2">
            Pratique
          </th>
        </tr>
        <tr className="bg-[#c8c8c8] text-gray-900">
          <th className="border border-black p-1.5">De</th>
          <th className="border border-black p-1.5">À</th>
          <th className="border border-black p-1.5">Total</th>
          <th className="border border-black p-1.5">De</th>
          <th className="border border-black p-1.5">À</th>
          <th className="border border-black p-1.5">Total</th>
        </tr>
      </thead>

      <tbody>
        {lignes.map((ligne, index) => {
          const formationTotal = calculHeures(ligne.formationDe, ligne.formationA);
          const pratiqueTotal = calculHeures(ligne.pratiqueDe, ligne.pratiqueA);
          const premiereLigneDuJour = index % 2 === 0;

          return (
            <tr key={index}>
              {premiereLigneDuJour && (
                <td
                  rowSpan={2}
                  className="border border-black p-2 text-left align-middle bg-[#c8c8c8]"
                >
                  {ligne.jour}
                </td>
              )}

              <td className="border border-black p-0.5">
                {editable ? (
                  <input
                    type="date"
                    value={ligne.date}
                    onChange={(e) => set(index, "date", e.target.value)}
                    className="w-full px-1 py-1 text-xs outline-none bg-transparent"
                  />
                ) : (
                  <span className="block text-center text-xs">{ligne.date || ""}</span>
                )}
              </td>

              <td className="border border-black p-1">
                {editable ? (
                  <input
                    type="text"
                    value={ligne.matiere}
                    onChange={(e) => set(index, "matiere", e.target.value)}
                    placeholder="Matière"
                    className="w-full px-1.5 py-1 text-sm outline-none bg-transparent"
                  />
                ) : (
                  <span className="px-1.5">{ligne.matiere || "—"}</span>
                )}
              </td>

              <td className="border border-black p-0 text-center">
                {editable ? (
                  <select
                    value={ligne.type}
                    onChange={(e) => set(index, "type", e.target.value)}
                    className="w-full px-0.5 py-1.5 text-xs outline-none bg-transparent text-center"
                  >
                    <option value="P">P</option>
                    <option value="L">L</option>
                  </select>
                ) : (
                  ligne.type
                )}
              </td>

              <td className="border border-black p-0">
                {editable ? (
                  <SelectHeure
                    value={ligne.formationDe}
                    onChange={(v) => set(index, "formationDe", v)}
                  />
                ) : (
                  <span className="block text-center text-xs">
                    {heureLabel(ligne.formationDe)}
                  </span>
                )}
              </td>
              <td className="border border-black p-0">
                {editable ? (
                  <SelectHeure
                    value={ligne.formationA}
                    onChange={(v) => set(index, "formationA", v)}
                  />
                ) : (
                  <span className="block text-center text-xs">
                    {heureLabel(ligne.formationA)}
                  </span>
                )}
              </td>
              <td className="border border-black p-1.5 text-center bg-gray-100 text-xs">
                {formationTotal || ""}
              </td>

              <td className="border border-black p-0">
                {editable ? (
                  <SelectHeure
                    value={ligne.pratiqueDe}
                    onChange={(v) => set(index, "pratiqueDe", v)}
                  />
                ) : (
                  <span className="block text-center text-xs">
                    {heureLabel(ligne.pratiqueDe)}
                  </span>
                )}
              </td>
              <td className="border border-black p-0">
                {editable ? (
                  <SelectHeure
                    value={ligne.pratiqueA}
                    onChange={(v) => set(index, "pratiqueA", v)}
                  />
                ) : (
                  <span className="block text-center text-xs">
                    {heureLabel(ligne.pratiqueA)}
                  </span>
                )}
              </td>
              <td className="border border-black p-1.5 text-center bg-gray-100 text-xs">
                {pratiqueTotal || ""}
              </td>
            </tr>
          );
        })}

        <tr className="bg-[#c8c8c8] font-semibold">
          <td colSpan={4} className="border border-black p-2 text-center">
            TOTAL
          </td>
          <td colSpan={2} className="border border-black"></td>
          <td className="border border-black p-2 text-center">
            {totalFormation.toFixed(2)}
          </td>
          <td colSpan={2} className="border border-black"></td>
          <td className="border border-black p-2 text-center">
            {totalPratique.toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Mêmes couleurs que les cartes "En attente" / "Validées" / "Refusées" plus
// haut sur la page (StatCard, ACCENT_COULEURS), pour rester cohérent
// visuellement.
const SERIES = [
  { key: "enAttente", name: "En attente", color: "#a05a2c" },
  { key: "validees", name: "Validées", color: "#2d6a4f" },
  { key: "refusees", name: "Refusées", color: "#9d3b3b" },
  { key: "brouillons", name: "Brouillons", color: "#6b7280" },
] as const;

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: any[];
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const { name, value, payload: item } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.fill }}
        />
        <span className="font-medium text-gray-900">{name}</span>
      </div>
      <div className="text-gray-500 mt-0.5">
        {value} fiche{value > 1 ? "s" : ""} · {pct}%
      </div>
    </div>
  );
}

export default function DashboardChart({
  enAttente,
  validees,
  refusees,
  brouillons,
}: {
  enAttente: number;
  validees: number;
  refusees: number;
  brouillons: number;
}) {
  const values = { enAttente, validees, refusees, brouillons };
  const total = enAttente + validees + refusees + brouillons;

  const data = SERIES.map((s) => ({
    name: s.name,
    value: values[s.key],
    fill: s.color,
  }));

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        Aucune fiche pour le moment.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-10">
      <div className="relative h-64 w-64 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={76}
              outerRadius={116}
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500">
            fiche{total > 1 ? "s" : ""} au total
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-5">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2 font-medium text-gray-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  {item.name}
                </span>
                <span className="text-gray-500 tabular-nums">
                  <span className="font-semibold text-gray-900">{item.value}</span>{" "}
                  fiche{item.value > 1 ? "s" : ""} · {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: item.fill }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

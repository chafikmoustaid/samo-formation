"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const SERIES = [
  { key: "enAttente", name: "En attente", color: "#f59e0b" },
  { key: "refusees", name: "Refusées", color: "#dc2626" },
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
  refusees,
}: {
  enAttente: number;
  refusees: number;
}) {
  const values = { enAttente, refusees };
  const total = enAttente + refusees;

  const data = SERIES.map((s) => ({
    name: s.name,
    value: values[s.key],
    fill: s.color,
  }));

  if (total === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
        Aucune fiche en attente ou refusée.
      </div>
    );
  }

  return (
    <div className="relative h-80">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={72}
            outerRadius={110}
            paddingAngle={3}
            cornerRadius={6}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip total={total} />} />

          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center -translate-y-4">
        <div className="text-3xl font-bold text-gray-900">{total}</div>
        <div className="text-xs text-gray-500">
          fiche{total > 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

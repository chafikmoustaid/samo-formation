"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#eab308",
  "#22c55e",
  "#ef4444",
];

export default function DashboardChart({
  enAttente,
  validees,
  refusees,
}: {
  enAttente: number;
  validees: number;
  refusees: number;
}) {
  const data = [
    {
      name: "En attente",
      value: enAttente,
    },
    {
      name: "Validées",
      value: validees,
    },
    {
      name: "Refusées",
      value: refusees,
    },
  ];

  return (
    <div className="h-96">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            outerRadius={120}
            label
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={COLORS[index]}
              />
            ))}
          </Pie>

          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
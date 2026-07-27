const ACCENT_CLASSES = {
  neutral: "text-gray-900",
  green: "text-green-700",
  orange: "text-orange-600",
  red: "text-red-600",
} as const;

export default function StatCard({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  accent?: keyof typeof ACCENT_CLASSES;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${ACCENT_CLASSES[accent]}`}>
        {value}
      </div>
    </div>
  );
}

import Link from "next/link";

const ACCENT_CLASSES = {
  neutral: "text-gray-900",
  green: "text-green-700",
  orange: "text-orange-600",
  red: "text-red-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
} as const;

const ACCENT_BAR_CLASSES = {
  neutral: "bg-gray-300",
  green: "bg-green-600",
  orange: "bg-orange-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
} as const;

export default function StatCard({
  label,
  value,
  accent = "neutral",
  href,
}: {
  label: string;
  value: React.ReactNode;
  accent?: keyof typeof ACCENT_CLASSES;
  href?: string;
}) {
  const contenu = (
    <>
      <div className={`h-1.5 rounded-full mb-4 ${ACCENT_BAR_CLASSES[accent]}`} />
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${ACCENT_CLASSES[accent]}`}>
        {value}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 pt-4 hover:border-green-300 hover:shadow-md transition"
      >
        {contenu}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 pt-4">
      {contenu}
    </div>
  );
}

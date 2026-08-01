import Link from "next/link";

// Style plat et sobre (un seul accent, le vert de marque, sur "orange"
// gardé uniquement pour signaler une action requise) — pas de dégradés,
// pas d'ombres, pas de palette arc-en-ciel.
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
  href,
}: {
  label: string;
  value: React.ReactNode;
  accent?: keyof typeof ACCENT_CLASSES;
  href?: string;
}) {
  const contenu = (
    <>
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
        className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-green-600 transition-colors"
      >
        {contenu}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {contenu}
    </div>
  );
}

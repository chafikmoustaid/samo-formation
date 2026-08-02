import Link from "next/link";

// Tuiles pleines et colorées (fond uni, texte blanc) — chaque accent garde
// un sens (bleu = neutre/total, vert = validé, orange = action requise,
// rouge = refusé), mais le rendu est maintenant coloré et affirmé plutôt
// que blanc avec juste le chiffre en couleur.
const ACCENT_COULEURS = {
  neutral: "#2563eb",
  green: "#16a34a",
  orange: "#ea580c",
  red: "#dc2626",
} as const;

export default function StatCard({
  label,
  value,
  accent = "neutral",
  color,
  href,
}: {
  label: string;
  value: React.ReactNode;
  accent?: keyof typeof ACCENT_COULEURS;
  /** Couleur (hex) qui prend le dessus sur `accent`, pour distinguer des
   * cartes qui n'ont pas de sens sémantique commun (ex. plusieurs cartes
   * "action requise" qui doivent quand même être visuellement différentes). */
  color?: string;
  href?: string;
}) {
  const contenu = (
    <>
      <div className="text-sm font-semibold text-white/80">{label}</div>
      <div className="text-4xl font-extrabold mt-2 text-white">{value}</div>
    </>
  );

  const style = { backgroundColor: color ?? ACCENT_COULEURS[accent] };

  if (href) {
    return (
      <Link
        href={href}
        style={style}
        className="block rounded-xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        {contenu}
      </Link>
    );
  }

  return (
    <div style={style} className="rounded-xl p-6 shadow-sm">
      {contenu}
    </div>
  );
}

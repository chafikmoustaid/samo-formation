import Link from "next/link";

// Bouton lien plein, coloré, texte en gras — utilisé pour les sections
// "Accès rapide" et "Mes matières" des portails (étudiant, formateur,
// administration), pour un rendu cohérent et plus visuel que les boutons
// blancs/contour utilisés ailleurs dans l'app.
export default function ColorLinkButton({
  href,
  color,
  children,
}: {
  href: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{ backgroundColor: color }}
      className="inline-flex items-center px-4 py-2.5 rounded-lg text-white font-bold text-base shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {children}
    </Link>
  );
}

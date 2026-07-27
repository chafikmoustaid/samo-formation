// Système de boutons partagé — remplace la palette arc-en-ciel précédente
// (un bleu/violet/orange/teal différent par bouton) par un jeu cohérent :
// vert SAMO pour l'action principale, gris/blanc pour le secondaire,
// rouge pour les actions destructrices, ambre pour l'attention.

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "ghost";

export type ButtonSize = "md" | "sm";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-green-700 hover:bg-green-800 text-white shadow-sm",
  secondary: "bg-gray-800 hover:bg-gray-900 text-white shadow-sm",
  outline:
    "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  ghost: "text-green-700 hover:underline",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-sm",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = ""
) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .join(" ")
    .trim();
}

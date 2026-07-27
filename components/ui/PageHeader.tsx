import Link from "next/link";

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "← Retour",
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {action}
        {backHref && (
          <Link
            href={backHref}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

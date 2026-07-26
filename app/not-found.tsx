import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <Image
        src="/logo-samo.png"
        alt="Formation SAMO"
        width={220}
        height={68}
        priority
        className="w-[180px] h-auto mb-10"
      />

      <div className="text-6xl font-bold text-green-700 mb-2">404</div>

      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        Page introuvable
      </h1>

      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        La page que tu cherches n&apos;existe pas ou a été déplacée.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-white text-sm font-medium px-8 py-3"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

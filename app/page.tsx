import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-white">
      {/* Décor discret en arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-green-100 blur-3xl opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-yellow-50 blur-3xl opacity-70"
      />

      <main className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/logo-samo.png"
          alt="Formation SAMO"
          width={340}
          height={104}
          priority
          className="w-[240px] sm:w-[300px] h-auto mb-8"
        />

        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 max-w-xl">
          Formation professionnelle à distance en support informatique
        </h1>

        <p className="mt-3 text-gray-500 max-w-md">
          Plateforme d&apos;apprentissage réservée aux étudiants, formateurs
          et à l&apos;administration.
        </p>

        <Link
          href="/login"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 transition-colors text-white text-base font-medium px-10 py-3.5 shadow-lg shadow-green-700/20"
        >
          Se connecter
        </Link>
      </main>

      <footer className="relative py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Formation SAMO — Depuis 1989
      </footer>
    </div>
  );
}

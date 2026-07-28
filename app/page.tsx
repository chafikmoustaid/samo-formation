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
          className="w-[300px] sm:w-[400px] h-auto mb-14"
        />

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <Link
            href="/login?role=student"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 hover:bg-green-800 transition-colors text-white text-lg font-medium px-10 py-4 shadow-lg shadow-green-700/20 w-64 sm:w-auto"
          >
            Espace étudiant
          </Link>

          <Link
            href="/login?role=instructor"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors text-white text-lg font-medium px-10 py-4 shadow-lg shadow-gray-900/20 w-64 sm:w-auto"
          >
            Espace formateur
          </Link>

          <Link
            href="/login?role=admin"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-600 hover:bg-slate-700 transition-colors text-white text-lg font-medium px-10 py-4 shadow-lg shadow-slate-600/20 w-64 sm:w-auto"
          >
            Administration
          </Link>
        </div>
      </main>

      <footer className="relative py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Formation SAMO — Depuis 1989
        {" · "}
        <Link href="/confidentialite" className="hover:text-gray-600 hover:underline">
          Politique de confidentialité
        </Link>
        {" · "}
        <Link href="/conditions-utilisation" className="hover:text-gray-600 hover:underline">
          Conditions d&apos;utilisation
        </Link>
      </footer>
    </div>
  );
}

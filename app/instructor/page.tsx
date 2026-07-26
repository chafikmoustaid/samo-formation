import Link from "next/link";

export default function InstructorPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">
        Portail Formateur
      </h1>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/instructor/import-support"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          📥 Publier un support
        </Link>

        <Link
          href="/instructor/supports/1"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          📄 Support séance 1
        </Link>

        <Link
          href="/instructor/tp/1"
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
        >
          🧪 TP séance 1
        </Link>

        <Link
          href="/instructor/assignments"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          🛠 Remises TP
        </Link>

        <Link
          href="/instructor/results"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          📊 Résultats
        </Link>

        <Link
          href="/instructor/progress"
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
        >
          📈 Progression
        </Link>
      </div>
    </div>
  );
}
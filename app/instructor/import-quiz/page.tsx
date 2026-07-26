export default function ImportQuizPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Importation de quiz
        </h1>

        <div className="mb-6">
          <label className="block mb-2">
            Quiz étudiant (.docx)
          </label>

          <input type="file" />
        </div>

        <div className="mb-6">
          <label className="block mb-2">
            Corrigé (.docx)
          </label>

          <input type="file" />
        </div>

        <button
          className="bg-green-600 text-white px-6 py-3 rounded-lg"
        >
          Importer
        </button>

      </div>

    </div>
  );
}
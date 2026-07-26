import { supabase } from "@/lib/supabase";

export default async function StudentQuizPage() {
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("session_id", 1);

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">

        <h1 className="text-4xl font-bold text-green-700 mb-8">
          Quiz : Introduction à l'informatique
        </h1>

        <form>

          {questions?.map((question, index) => (
            <div
              key={question.id}
              className="mb-8 border-b pb-6"
            >
              <h2 className="text-xl font-semibold mb-4">
                Question {index + 1}
              </h2>

              <p className="mb-4">
                {question.question}
              </p>

              <div className="space-y-2">

                <label className="block">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value="A"
                    className="mr-2"
                  />
                  {question.choix_a}
                </label>

                <label className="block">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value="B"
                    className="mr-2"
                  />
                  {question.choix_b}
                </label>

                <label className="block">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value="C"
                    className="mr-2"
                  />
                  {question.choix_c}
                </label>

                <label className="block">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value="D"
                    className="mr-2"
                  />
                  {question.choix_d}
                </label>

              </div>

            </div>
          ))}

          <button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
          >
            Soumettre le quiz
          </button>

        </form>

      </div>

    </div>
  );
}
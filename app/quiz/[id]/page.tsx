import { supabase } from "@/lib/supabase";
import QuizForm from "@/components/QuizForm";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("session_id", Number(id));

  return (
    <main style={{ padding: "40px" }}>
      <h1>Quiz séance {id}</h1>

      <QuizForm
        questions={questions || []}
      />
    </main>
  );
}
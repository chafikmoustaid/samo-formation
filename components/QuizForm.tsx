"use client";

import { useState } from "react";

export default function QuizForm({
  questions,
}: {
  questions: any[];
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<number | null>(null);

  const handleChange = (
    questionId: number,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const corrigerQuiz = () => {
    let score = 0;

    questions.forEach((q) => {
      if (answers[q.id] === q.bonne_reponse) {
        score++;
      }
    });

    setResult(score);
  };

  return (
    <>
      {questions.map((question) => (
        <div
          key={question.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3>{question.question}</h3>

          {["A", "B", "C", "D"]
            .filter(
              (choice) =>
                question[`choix_${choice.toLowerCase()}`]
            )
            .map((choice) => (
              <div key={choice}>
                <label>
                  <input
                    type="radio"
                    name={`q${question.id}`}
                    value={choice}
                    checked={answers[question.id] === choice}
                    onChange={() =>
                      handleChange(question.id, choice)
                    }
                  />
                  {" "}
                  {choice}.{" "}
                  {question[`choix_${choice.toLowerCase()}`]}
                </label>
              </div>
            ))}
        </div>
      ))}

      <button
        onClick={corrigerQuiz}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Corriger le quiz
      </button>

      {result !== null && (
        <div style={{ marginTop: "20px" }}>
          <h2>
            Résultat : {result} / {questions.length}
          </h2>

          <h3>
            {Math.round(
              (result / questions.length) * 100
            )}
            %
          </h3>
        </div>
      )}
    </>
  );
}
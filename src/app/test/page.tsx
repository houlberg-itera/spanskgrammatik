'use client';

import { useState } from 'react';
import ExerciseQuestion from '@/components/ExerciseQuestion';

export default function TestPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  // Test questions with special characters
  const testQuestions = [
    {
      id: "test1",
      type: "fill_in_blank" as const,
      question_da: "Complete: La _____ tiene un libro",
      correct_answer: "niña",
      explanation_da: "Niña means girl in Spanish. Note the ñ character.",
      points: 1
    },
    {
      id: "test2", 
      type: "translation" as const,
      question_da: "Translate: She is a doctor",
      correct_answer: "Ella es doctora",
      explanation_da: "This is a basic sentence structure in Spanish.",
      points: 1
    },
    {
      id: "test3",
      type: "translation" as const,
      question_da: "Translate: The girl has a book",
      correct_answer: "La niña tiene un libro",
      explanation_da: "This sentence tests both case sensitivity and special characters.",
      points: 1
    },
    {
      id: "test4",
      type: "conjugation" as const,
      question_da: "Conjugate 'estar' for 'él':",
      correct_answer: "está",
      explanation_da: "Está is the third person singular form of estar.",
      points: 1
    }
  ];

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

  // Manual test button to verify case sensitivity
  const manualTest = () => {
    // Test the specific cases you mentioned
    const testCases = [
      { userAnswer: 'ella es doctora', correctAnswer: 'Ella es doctora' },
      { userAnswer: 'esta', correctAnswer: 'está' },
      { userAnswer: 'nina', correctAnswer: 'niña' },
      { userAnswer: 'espanol', correctAnswer: 'español' }
    ];
    
    // Copy the exact logic from ExerciseQuestion
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .trim()
        .replace(/[áàâäã]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôöõ]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, ' ');
    };

    const compareAnswers = (userAnswer: string, correctAnswer: string) => {
      const originalUserAnswer = userAnswer.toLowerCase().trim();
      const originalCorrectAnswer = correctAnswer.toLowerCase().trim();
      
      const exactMatch = originalUserAnswer === originalCorrectAnswer;
      
      const normalizedUserAnswer = normalizeText(userAnswer);
      const normalizedCorrectAnswer = normalizeText(correctAnswer);
      
      const normalizedMatch = normalizedUserAnswer === normalizedCorrectAnswer;
      const hasSpecialCharacterDifference = !exactMatch && normalizedMatch;
      
      return {
        isCorrect: exactMatch || normalizedMatch,
        hasSpecialCharacterDifference,
        normalizedUserAnswer,
        normalizedCorrectAnswer
      };
    };

    let resultText = 'Test Results:\n\n';
    
    testCases.forEach((testCase, index) => {
      const result = compareAnswers(testCase.userAnswer, testCase.correctAnswer);
      resultText += `${index + 1}. "${testCase.userAnswer}" vs "${testCase.correctAnswer}"\n`;
      resultText += `   Result: ${result.isCorrect ? 'CORRECT ✅' : 'INCORRECT ❌'}\n`;
      resultText += `   Exact match: ${testCase.userAnswer.toLowerCase().trim() === testCase.correctAnswer.toLowerCase().trim()}\n`;
      resultText += `   Normalized: "${result.normalizedUserAnswer}" vs "${result.normalizedCorrectAnswer}"\n`;
      resultText += `   Special char difference: ${result.hasSpecialCharacterDifference}\n\n`;
    });
    
    alert(resultText);
  };

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[áàâäã]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, ' ');
  };

  const testCases = [
    { user: "la ninja tiene un libro", correct: "La niña tiene un libro", description: "Case + special char test" },
    { user: "nina", correct: "niña", description: "Missing ñ test" },
    { user: "esta", correct: "está", description: "Missing accent test" },
    { user: "LA NIÑA TIENE UN LIBRO", correct: "La niña tiene un libro", description: "All caps test" }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Case Sensitivity & Special Characters</h1>
        
        {/* Test Questions */}
        <div className="space-y-8 mb-8">
          <h2 className="text-xl font-semibold">Interactive Test Questions:</h2>
          {testQuestions.map((question) => (
            <ExerciseQuestion
              key={question.id}
              question={question}
              onAnswer={handleAnswer}
              userAnswer={answers[question.id] || ''}
              showResult={showResults}
              level="A1"
            />
          ))}
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={handleShowResults}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Show Results
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={manualTest}
            className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Test Special Characters
          </button>
        </div>

        {/* Test Cases Analysis */}
        <div className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Test Cases Analysis:</h2>
          <div className="space-y-4">
            {testCases.map((testCase, index) => {
              const normalizedUser = normalizeText(testCase.user);
              const normalizedCorrect = normalizeText(testCase.correct);
              const exactMatch = testCase.user.toLowerCase().trim() === testCase.correct.toLowerCase().trim();
              const normalizedMatch = normalizedUser === normalizedCorrect;
              const shouldBeCorrect = exactMatch || normalizedMatch;
              
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{testCase.description}</h3>
                  <p><strong>User input:</strong> "{testCase.user}"</p>
                  <p><strong>Correct answer:</strong> "{testCase.correct}"</p>
                  <p><strong>Normalized user:</strong> "{normalizedUser}"</p>
                  <p><strong>Normalized correct:</strong> "{normalizedCorrect}"</p>
                  <p><strong>Exact match:</strong> {exactMatch ? '✅' : '❌'}</p>
                  <p><strong>Normalized match:</strong> {normalizedMatch ? '✅' : '❌'}</p>
                  <p className={`font-bold ${shouldBeCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    <strong>Result:</strong> {shouldBeCorrect ? '✅ CORRECT' : '❌ INCORRECT'}
                  </p>
                  {!exactMatch && normalizedMatch && (
                    <p className="text-yellow-600">
                      💡 <strong>Special character difference detected</strong> - should show tip
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Try entering answers with missing special characters (e.g., "nina" instead of "niña")</li>
            <li>Try different cases (e.g., "LA NINA" instead of "La niña")</li>
            <li>Check that correct answers are accepted even with missing accents</li>
            <li>Verify that special character tips are shown when appropriate</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

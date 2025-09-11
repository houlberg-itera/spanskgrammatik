'use client';

import { useState } from 'react';
import { SpanishLevel } from '@/types/database';

interface ArticleExerciseGeneratorProps {
  level: SpanishLevel;
}

interface GeneratedExercise {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    type: string;
    options?: string[];
    correct_answer: string;
    explanation: string;
    danish_context: string;
  }>;
  learning_tips: string[];
}

export default function ArticleExerciseGenerator({ level }: ArticleExerciseGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExercise, setGeneratedExercise] = useState<GeneratedExercise | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateExercise = async (type: string, focus: string) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedExercise(null);

    try {
      const response = await fetch('/api/generate-article-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          type,
          focus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate exercise');
      }

      const exercise = await response.json();
      setGeneratedExercise(exercise);
    } catch (err) {
      setError('Der opstod en fejl ved genereringen af øvelsen. Prøv igen senere.');
      console.error('Error generating exercise:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🤖 AI Øvelsesgenerator</h2>
        <p className="text-gray-600 mb-6">
          Generer personlige øvelser tilpasset dit niveau ({level}) med AI.
        </p>

        {/* Generation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Bestemte Artikler (el/la)</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleGenerateExercise('multiple_choice', 'definite articles')}
                disabled={isGenerating}
                className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? 'Genererer...' : 'Multiple Choice'}
              </button>
              <button
                onClick={() => handleGenerateExercise('fill_blank', 'definite articles')}
                disabled={isGenerating}
                className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? 'Genererer...' : 'Udfyld Blanke'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Ubestemte Artikler (un/una)</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleGenerateExercise('multiple_choice', 'indefinite articles')}
                disabled={isGenerating}
                className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? 'Genererer...' : 'Multiple Choice'}
              </button>
              <button
                onClick={() => handleGenerateExercise('fill_blank', 'indefinite articles')}
                disabled={isGenerating}
                className="w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? 'Genererer...' : 'Udfyld Blanke'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Generated Exercise Display */}
        {generatedExercise && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{generatedExercise.title}</h3>
            <p className="text-gray-600 mb-4">{generatedExercise.description}</p>

            {/* Questions */}
            <div className="space-y-4 mb-6">
              {generatedExercise.questions.map((question, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border">
                  <p className="font-semibold text-gray-800 mb-2">
                    {index + 1}. {question.question}
                  </p>
                  
                  {question.options && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-2 rounded border ${
                            option.includes(question.correct_answer) 
                              ? 'bg-green-100 border-green-300' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}

                  {!question.options && (
                    <div className="mb-3">
                      <span className="font-semibold text-green-600">Svar: {question.correct_answer}</span>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <p className="mb-1"><strong>Forklaring:</strong> {question.explanation}</p>
                    <p><strong>Dansk kontekst:</strong> {question.danish_context}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Learning Tips */}
            {generatedExercise.learning_tips && generatedExercise.learning_tips.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Læringstips</h4>
                <ul className="list-disc list-inside space-y-1">
                  {generatedExercise.learning_tips.map((tip, index) => (
                    <li key={index} className="text-blue-700 text-sm">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Level Info */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Dit nuværende niveau:</strong> {level} - Øvelserne tilpasses automatisk dit niveau.
          </p>
        </div>
      </div>
    </div>
  );
}

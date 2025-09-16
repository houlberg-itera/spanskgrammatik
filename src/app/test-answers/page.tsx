'use client';

import { useState } from 'react';
import ExerciseQuestion from '@/components/ExerciseQuestion';
import { Question } from '@/types/database';

export default function TestAnswersPage() {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  
  const sampleQuestions: Question[] = [
    {
      id: 'test-1',
      type: 'multiple_choice',
      question_da: 'Hvad betyder "hola" på dansk?',
      question_es: '¿Qué significa "hola" en danés?',
      correct_answer: 'Hej',
      options: ['Hej', 'Farvel', 'Tak', 'Undskyld'],
      points: 1
    },
    {
      id: 'test-2', 
      type: 'translation',
      question_da: 'Oversæt "Jeg hedder Maria" til spansk:',
      question_es: 'Traduce "Jeg hedder Maria" al español:',
      correct_answer: 'Me llamo Maria',
      points: 1
    },
    {
      id: 'test-3',
      type: 'fill_in_blank',
      question_da: 'Udfyld: "Yo ___ estudiante" (Jeg er studerende)',
      question_es: 'Completa: "Yo ___ estudiante"',
      correct_answer: 'soy',
      points: 1
    },
    {
      id: 'test-4',
      type: 'conjugation',
      question_da: 'Bøj verbet "hablar" (at tale) for "nosotros":',
      question_es: 'Conjuga el verbo "hablar" para "nosotros":',
      correct_answer: 'hablamos',
      points: 1
    }
  ];

  const handleAnswer = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test: Korrekte Svar Visning</h1>
        <p className="text-lg text-gray-600 mb-8">
          Dette er en test af funktionaliteten hvor korrekte svar vises efter hvert spørgsmål besvares.
        </p>
        
        <div className="space-y-8">
          {sampleQuestions.map((question, index) => (
            <div key={question.id} className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-4">Spørgsmål {index + 1}:</h3>
              <ExerciseQuestion
                question={question}
                onAnswer={handleAnswer}
                userAnswer={userAnswers[question.id]}
                showResult={!!userAnswers[question.id] && userAnswers[question.id] !== ''}
                disabled={false}
                level="A1"
                enableAiFeedback={false}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Test Instruktioner:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Besvar hvert spørgsmål ovenfor</li>
            <li>Efter du har svaret, skulle du se det korrekte svar</li>
            <li>Grønne felter betyder korrekt svar</li>
            <li>Røde felter betyder forkert svar</li>
            <li>For multiple choice vises ✓ og ✗ markering</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
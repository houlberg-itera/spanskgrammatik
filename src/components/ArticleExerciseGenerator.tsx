'use client';

import { useState } from 'react';
import { SpanishLevel } from '@/types/database';

interface ArticleExerciseGeneratorProps {
  level: SpanishLevel;
}

interface GeneratedQuestion {
  question: string;
  type: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  danish_context: string;
}

interface GeneratedExercise {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
  learning_tips: string[];
}

export default function ArticleExerciseGenerator({ level }: ArticleExerciseGeneratorProps) {
  const [exercise, setExercise] = useState<GeneratedExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');

  const generateExercise = async (focus: string, type: string) => {
    setLoading(true);
    setExercise(null);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setShowResults(false);
    setSelectedAnswer('');

    try {
      const response = await fetch('/api/generate-article-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          type,
          focus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate exercise');
      }

      const data = await response.json();
      setExercise(data);
    } catch (error) {
      console.error('Error generating exercise:', error);
      // Set a fallback exercise
      setExercise({
        title: 'Artikel Øvelse Fejl',
        description: 'Der opstod en fejl ved genereringen. Prøv igen.',
        questions: [],
        learning_tips: ['Prøv at generere øvelsen igen']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answer;
    setUserAnswers(newAnswers);
    setSelectedAnswer(answer);
  };

  const nextQuestion = () => {
    if (currentQuestion < (exercise?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1] || '');
    } else {
      setShowResults(true);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1] || '');
    }
  };

  const resetExercise = () => {
    setExercise(null);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setShowResults(false);
    setSelectedAnswer('');
  };

  const calculateScore = () => {
    if (!exercise) return { correct: 0, total: 0 };
    
    const correct = exercise.questions.filter((q, index) => 
      userAnswers[index] === q.correct_answer
    ).length;
    
    return { correct, total: exercise.questions.length };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Genererer artikel øvelse med AI...</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🤖 AI Artikel Generator</h2>
          <p className="text-gray-600">
            Generer personaliserede artikel øvelser med AI til {level} niveau
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">🎯 Bestemt Artikel (el/la)</h3>
            <p className="text-blue-700 mb-4">
              Øv brugen af &ldquo;el&rdquo; og &ldquo;la&rdquo; - svarer til danske &ldquo;-en/-et&rdquo;
            </p>
            <div className="space-y-2">
              <button
                onClick={() => generateExercise('definite articles', 'multiple_choice')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Multiple Choice Øvelse
              </button>
              <button
                onClick={() => generateExercise('definite articles', 'fill_blank')}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Udfyld Blanke
              </button>
              <button
                onClick={() => generateExercise('definite articles', 'translation')}
                className="w-full px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 transition-colors"
              >
                Oversættelse
              </button>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-green-900 mb-4">📝 Ubestemt Artikel (un/una)</h3>
            <p className="text-green-700 mb-4">
              Øv brugen af &ldquo;un&rdquo; og &ldquo;una&rdquo; - svarer til danske &ldquo;en/et&rdquo;
            </p>
            <div className="space-y-2">
              <button
                onClick={() => generateExercise('indefinite articles', 'multiple_choice')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Multiple Choice Øvelse
              </button>
              <button
                onClick={() => generateExercise('indefinite articles', 'fill_blank')}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Udfyld Blanke
              </button>
              <button
                onClick={() => generateExercise('indefinite articles', 'translation')}
                className="w-full px-4 py-2 bg-green-400 text-white rounded-md hover:bg-green-500 transition-colors"
              >
                Oversættelse
              </button>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-yellow-900 mb-4">🔀 Blandet Træning</h3>
          <p className="text-yellow-700 mb-4">
            Øv alle artikler sammen - el, la, un, una
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => generateExercise('mixed articles', 'multiple_choice')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Blandet Multiple Choice
            </button>
            <button
              onClick={() => generateExercise('mixed articles', 'fill_blank')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              Blandet Udfyld Blanke
            </button>
            <button
              onClick={() => generateExercise('mixed articles', 'translation')}
              className="px-4 py-2 bg-yellow-400 text-white rounded-md hover:bg-yellow-500 transition-colors"
            >
              Blandet Oversættelse
            </button>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">💡 Hurtig Reference:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <strong>Bestemt artikel:</strong>
              <br />• el (hankøn): el perro, el libro
              <br />• la (hunkøn): la mesa, la manzana
            </div>
            <div>
              <strong>Ubestemt artikel:</strong>
              <br />• un (hankøn): un perro, un libro
              <br />• una (hunkøn): una mesa, una manzana
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score.correct / score.total) * 100);

    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 Øvelse Fuldført!</h2>
          <div className="text-6xl font-bold mb-4">
            <span className={percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}>
              {percentage}%
            </span>
          </div>
          <p className="text-xl text-gray-700">
            {score.correct} ud af {score.total} korrekte svar
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {exercise.questions.map((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === question.correct_answer;
            
            return (
              <div key={index} className={`border rounded-lg p-4 ${
                isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Spørgsmål {index + 1}</span>
                  <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? '✅ Korrekt' : '❌ Forkert'}
                  </span>
                </div>
                <p className="text-gray-800 mb-2">{question.question}</p>
                <div className="text-sm">
                  <p><strong>Dit svar:</strong> {userAnswer}</p>
                  <p><strong>Korrekt svar:</strong> {question.correct_answer}</p>
                  <p className="text-gray-600 mt-2"><strong>Forklaring:</strong> {question.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>

        {exercise.learning_tips.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">💡 Læringstips:</h3>
            <ul className="space-y-2 text-blue-800">
              {exercise.learning_tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={resetExercise}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Lav Ny Øvelse
          </button>
        </div>
      </div>
    );
  }

  const currentQ = exercise.questions[currentQuestion];
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{exercise.title}</h2>
          <span className="text-gray-600">
            {currentQuestion + 1} / {exercise.questions.length}
          </span>
        </div>
        <p className="text-gray-600">{exercise.description}</p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / exercise.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQ.question}
        </h3>

        {currentQ.type === 'multiple_choice' && currentQ.options ? (
          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option.split(') ')[1])}
                className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                  selectedAnswer === option.split(') ')[1]
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => {
                setSelectedAnswer(e.target.value);
                handleAnswer(e.target.value);
              }}
              className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg"
              placeholder="Skriv din artikel her (el/la/un/una)"
            />
          </div>
        )}

        {userAnswers[currentQuestion] && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800"><strong>Forklaring:</strong> {currentQ.explanation}</p>
            <p className="text-blue-700 mt-2"><strong>Dansk sammenhæng:</strong> {currentQ.danish_context}</p>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={previousQuestion}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Forrige
          </button>
          
          <button
            onClick={nextQuestion}
            disabled={!userAnswers[currentQuestion]}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion === exercise.questions.length - 1 ? 'Afslut Øvelse' : 'Næste →'}
          </button>
        </div>
      </div>
    </div>
  );
}

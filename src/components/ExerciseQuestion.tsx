'use client';

import { useState, useEffect } from 'react';
import { Question, ExerciseAttempt, SpanishLevel } from '@/types/database';

interface ExerciseQuestionProps {
  question: Question;
  onAnswer: (questionId: string, answer: string | string[]) => void;
  userAnswer?: string | string[];
  showResult?: boolean;
  disabled?: boolean;
  level?: SpanishLevel;
  enableAiFeedback?: boolean;
}

export default function ExerciseQuestion({
  question,
  onAnswer,
  userAnswer,
  showResult = false,
  disabled = false,
  level = 'A1',
  enableAiFeedback = true,
}: ExerciseQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>(userAnswer || '');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { 
      userAnswer, 
      selectedAnswer,
      questionId: question.id 
    });
    
    if (userAnswer !== undefined) {
      console.log('📥 Setting answer from userAnswer:', userAnswer);
      setSelectedAnswer(userAnswer);
    } else {
      // Clear the answer when moving to a new question (userAnswer becomes undefined)
      console.log('🗑️ Clearing answer and feedback');
      setSelectedAnswer('');
      setAiFeedback(null); // Also clear AI feedback
    }
  }, [userAnswer, question.id]);

  const handleAnswerChange = (answer: string | string[]) => {
    console.log('🎯 handleAnswerChange called:', { 
      answer, 
      disabled, 
      questionId: question.id 
    });
    
    if (disabled) {
      console.log('❌ Answer blocked - component is disabled');
      return;
    }
    
    setSelectedAnswer(answer);
    onAnswer(question.id, answer);
    console.log('✅ Answer set and onAnswer called');
  };

  // Helper function to normalize text for comparison
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      // Remove punctuation and special characters
      .replace(/[.,:;!?¡¿]/g, '')
      // Normalize Spanish special characters to basic letters
      .replace(/[áàâäã]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper function to render sentence translation
  const renderSentenceTranslation = () => {
    // Check if we have a direct Danish translation
    if (question.sentence_translation_da) {
      return (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-sm">💡</span>
            <div>
              <p className="text-xs font-medium text-blue-700 mb-1">Dansk oversættelse:</p>
              <p className="text-sm text-blue-800">{question.sentence_translation_da}</p>
            </div>
          </div>
        </div>
      );
    }

    // For fill_in_blank and conjugation, try to extract Spanish sentence from question
    if ((question.type === 'fill_in_blank' || question.type === 'conjugation') && question.question_da) {
      // Look for Spanish text in the question (after "sætning:", "sentence:", or similar)
      const spanishSentenceMatch = question.question_da.match(/sætning[:\s]+([^"]+)|sentence[:\s]+([^"]+)/i);
      if (spanishSentenceMatch) {
        const spanishSentence = (spanishSentenceMatch[1] || spanishSentenceMatch[2])?.trim();
        if (spanishSentence && spanishSentence.length > 5) { // Reasonable length check
          return (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-amber-600 text-sm">🔤</span>
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Spansk sætning:</p>
                  <p className="text-sm text-amber-800 font-medium">{spanishSentence}</p>
                  <p className="text-xs text-amber-600 mt-1 italic">
                    (Dansk oversættelse ikke tilgængelig)
                  </p>
                </div>
              </div>
            </div>
          );
        }
      }
    }

    return null;
  };

  // Helper function to compare answers with special character handling
  const compareAnswers = (userAnswer: string, correctAnswer: string): boolean => {
    const originalUserAnswer = userAnswer.toLowerCase().trim();
    const originalCorrectAnswer = correctAnswer.toLowerCase().trim();
    
    // Check exact match first (case-insensitive only)
    if (originalUserAnswer === originalCorrectAnswer) {
      return true;
    }

    // Check normalized match (without special characters and punctuation)
    const normalizedUserAnswer = normalizeText(userAnswer);
    const normalizedCorrectAnswer = normalizeText(correctAnswer);
    
    return normalizedUserAnswer === normalizedCorrectAnswer;
  };

  // Helper function to check if answer is correct
  const isAnswerCorrect = () => {
    if (!userAnswer || !question.correct_answer) return false;
    
    if (Array.isArray(question.correct_answer)) {
      const userAnswerStr = Array.isArray(userAnswer) ? userAnswer.join(',') : String(userAnswer);
      const correctAnswerStr = question.correct_answer.join(',');
      return compareAnswers(userAnswerStr, correctAnswerStr);
    }
    
    const userAnswerStr = Array.isArray(userAnswer) ? userAnswer.join(',') : String(userAnswer);
    const correctAnswerStr = String(question.correct_answer);
    
    return compareAnswers(userAnswerStr, correctAnswerStr);
  };

  // Helper function to render correct answer display
  const renderCorrectAnswerDisplay = () => {
    if (!showResult) return null;
    
    const isCorrect = isAnswerCorrect();
    const correctAnswerDisplay = Array.isArray(question.correct_answer) 
      ? question.correct_answer.join(', ') 
      : String(question.correct_answer);
    
    return (
      <div className={`mt-3 p-3 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center space-x-2 mb-2">
          <span className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? '✓ Korrekt!' : '✗ Forkert'}
          </span>
        </div>
        <div className="text-sm">
          <span className="font-medium text-gray-700">Korrekte svar: </span>
          <span className="font-semibold text-gray-900">{correctAnswerDisplay}</span>
        </div>
        {!isCorrect && userAnswer && (
          <div className="text-sm mt-1">
            <span className="font-medium text-gray-700">Dit svar: </span>
            <span className="text-red-600">{Array.isArray(userAnswer) ? userAnswer.join(', ') : String(userAnswer)}</span>
          </div>
        )}
      </div>
    );
  };

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          {renderSentenceTranslation()}
          <div className="space-y-2">
            {question.options?.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = showResult && compareAnswers(option, String(question.correct_answer));
              const isWrongSelection = showResult && isSelected && !compareAnswers(option, String(question.correct_answer));
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerChange(option)}
                  disabled={disabled}
                  className={`w-full p-3 text-left border rounded-lg transition-colors ${
                    disabled 
                      ? `cursor-not-allowed ${
                          isCorrect 
                            ? 'bg-green-100 border-green-300 text-green-800' 
                            : isWrongSelection
                            ? 'bg-red-100 border-red-300 text-red-800'
                            : isSelected
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`
                      : isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && isCorrect && <span className="text-green-600 font-bold">✓</span>}
                    {showResult && isWrongSelection && <span className="text-red-600 font-bold">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {renderCorrectAnswerDisplay()}
        </div>
      );

    case 'conjugation':
      console.log('🔍 Conjugation question debug:', { 
        disabled, 
        selectedAnswer, 
        questionId: question.id,
        showResult 
      });
      return (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          {renderSentenceTranslation()}
          <input
            type="text"
            value={selectedAnswer as string}
            onChange={(e) => {
              console.log('📝 Input change:', e.target.value);
              handleAnswerChange(e.target.value);
            }}
            disabled={disabled}
            autoFocus={!showResult}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResult 
                ? isAnswerCorrect()
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : ''
            }`}
            placeholder="Skriv den bøjede form..."
          />
          {renderCorrectAnswerDisplay()}
        </div>
      );

    case 'fill_in_blank':
      return (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          {renderSentenceTranslation()}
          <input
            type="text"
            value={selectedAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={disabled}
            autoFocus={!showResult}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResult 
                ? isAnswerCorrect()
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : ''
            }`}
            placeholder="Udfyld det manglende ord..."
          />
          {renderCorrectAnswerDisplay()}
        </div>
      );

    case 'translation':
      return (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          {renderSentenceTranslation()}
          <input
            type="text"
            value={selectedAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={disabled}
            autoFocus={!showResult}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResult 
                ? isAnswerCorrect()
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : ''
            }`}
            placeholder="Oversæt til spansk..."
          />
          {renderCorrectAnswerDisplay()}
        </div>
      );

    default:
      return (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          {renderSentenceTranslation()}
          <input
            type="text"
            value={selectedAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={disabled}
            autoFocus={!showResult}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResult 
                ? isAnswerCorrect()
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : ''
            }`}
            placeholder="Skriv dit svar her..."
          />
          {renderCorrectAnswerDisplay()}
        </div>
      );
  }
}
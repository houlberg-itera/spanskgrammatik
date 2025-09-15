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
    if (userAnswer !== undefined) {
      setSelectedAnswer(userAnswer);
    }
  }, [userAnswer]);

  const handleAnswerChange = (answer: string | string[]) => {
    if (disabled) return;
    
    setSelectedAnswer(answer);
    onAnswer(question.id, answer);
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      // Remove or normalize special characters
      .replace(/[áàâäã]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      // Remove punctuation marks (periods, commas, exclamation marks, question marks, etc.)
      .replace(/[.,!?;:'"()[\]{}]/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const compareAnswers = (userAnswer: string, correctAnswer: string): { 
    isCorrect: boolean; 
    hasSpecialCharacterDifference: boolean;
    normalizedUserAnswer: string;
    normalizedCorrectAnswer: string;
  } => {
    const originalUserAnswer = userAnswer.toLowerCase().trim();
    const originalCorrectAnswer = correctAnswer.toLowerCase().trim();
    
    // Check if answers match exactly (case-insensitive only)
    const exactMatch = originalUserAnswer === originalCorrectAnswer;
    
    // Normalize both answers (remove special characters)
    const normalizedUserAnswer = normalizeText(userAnswer);
    const normalizedCorrectAnswer = normalizeText(correctAnswer);
    
    // Check if answers match when special characters are normalized
    const normalizedMatch = normalizedUserAnswer === normalizedCorrectAnswer;
    
    // Determine if there's a special character difference
    const hasSpecialCharacterDifference = !exactMatch && normalizedMatch;
    
    return {
      isCorrect: exactMatch || normalizedMatch, // Accept both exact and normalized matches
      hasSpecialCharacterDifference,
      normalizedUserAnswer,
      normalizedCorrectAnswer
    };
  };

  const isCorrect = () => {
    if (!showResult || !selectedAnswer) return false;
    
    if (Array.isArray(question.correct_answer)) {
      if (!Array.isArray(selectedAnswer)) return false;
      
      // Normalize and compare array answers
      const normalizedSelected = selectedAnswer.map(answer => normalizeText(answer)).sort();
      const normalizedCorrect = question.correct_answer.map(answer => normalizeText(answer)).sort();
      return normalizedSelected.join(',') === normalizedCorrect.join(',');
    }
    
    // Enhanced comparison with special character handling
    const userAnswer = String(selectedAnswer);
    const correctAnswer = String(question.correct_answer);
    
    const comparison = compareAnswers(userAnswer, correctAnswer);
    return comparison.isCorrect;
  };

  const getSpecialCharacterFeedback = () => {
    if (!showResult || !selectedAnswer || Array.isArray(question.correct_answer)) return null;
    
    const userAnswer = String(selectedAnswer);
    const correctAnswer = String(question.correct_answer);
    const comparison = compareAnswers(userAnswer, correctAnswer);
    
    if (comparison.hasSpecialCharacterDifference) {
      return (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="text-yellow-800">
            <strong>💡 Tip:</strong> Dit svar er korrekt! Der kan være mindre forskelle i tegnsætning, store bogstaver eller særlige tegn. 
            Du skrev: <strong>"{userAnswer}"</strong> - 
            Forventet format: <strong>"{correctAnswer}"</strong>
          </p>
        </div>
      );
    }
    
    return null;
  };

  const generateAiFeedback = async () => {
    if (!enableAiFeedback || !showResult || !selectedAnswer || loadingFeedback) return;
    
    setLoadingFeedback(true);
    try {
      const response = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAnswer: selectedAnswer,
          correctAnswer: question.correct_answer,
          question: question.question_da,
          level,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiFeedback(data.feedback);
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    if (showResult && selectedAnswer && enableAiFeedback && !isCorrect()) {
      generateAiFeedback();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, selectedAnswer]);

  const getResultClass = () => {
    if (!showResult) return '';
    return isCorrect() ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
  };

  const renderAiFeedback = () => {
    if (!enableAiFeedback || !showResult || isCorrect()) return null;

    return (
      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
        <div className="flex items-start space-x-2">
          <span className="text-purple-600 text-sm">🤖</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-800 mb-1">AI Feedback:</p>
            {loadingFeedback ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-purple-600">Genererer personlig feedback...</span>
              </div>
            ) : aiFeedback ? (
              <p className="text-sm text-purple-700">{aiFeedback}</p>
            ) : (
              <button
                onClick={generateAiFeedback}
                className="text-sm text-purple-600 hover:text-purple-800 underline"
              >
                Få AI feedback på dit svar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className={`p-6 border rounded-lg ${getResultClass()}`}>
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                  disabled ? 'cursor-not-allowed opacity-50' : ''
                } ${
                  showResult && option === question.correct_answer
                    ? 'border-green-500 bg-green-100'
                    : showResult && selectedAnswer === option && !isCorrect()
                    ? 'border-red-500 bg-red-100'
                    : selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={disabled}
                  className="mr-3"
                />
                {option}
              </label>
            ))}
          </div>
          {showResult && question.explanation_da && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Forklaring:</strong> {question.explanation_da}
              </p>
            </div>
          )}
          {renderAiFeedback()}
        </div>
      );

    case 'fill_in_blank':
      return (
        <div className={`p-6 border rounded-lg ${getResultClass()}`}>
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          <input
            type="text"
            value={selectedAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={disabled}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              disabled ? 'bg-gray-100' : ''
            } ${
              showResult
                ? isCorrect()
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
            placeholder="Skriv dit svar her..."
          />
          {showResult && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <strong>Dit svar:</strong> {selectedAnswer as string}
              </p>
              <p className="text-sm">
                <strong>Korrekte svar:</strong> {question.correct_answer as string}
              </p>
              {getSpecialCharacterFeedback()}
              {question.explanation_da && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Forklaring:</strong> {question.explanation_da}
                  </p>
                </div>
              )}
              {renderAiFeedback()}
            </div>
          )}
        </div>
      );

    case 'translation':
      return (
        <div className={`p-6 border rounded-lg ${getResultClass()}`}>
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          <textarea
            value={selectedAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={disabled}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              disabled ? 'bg-gray-100' : ''
            } ${
              showResult
                ? isCorrect()
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
            rows={3}
            placeholder="Skriv din oversættelse her..."
          />
          {showResult && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <strong>Din oversættelse:</strong> {selectedAnswer as string}
              </p>
              <p className="text-sm">
                <strong>Korrekte oversættelse:</strong> {question.correct_answer as string}
              </p>
              {question.explanation_da && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Forklaring:</strong> {question.explanation_da}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      );

    case 'conjugation':
      return (
        <div className={`p-6 border rounded-lg ${getResultClass()}`}>
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
          <input
            type="text"
            value={selectedAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={disabled}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              disabled ? 'bg-gray-100' : ''
            } ${
              showResult
                ? isCorrect()
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
            placeholder="Skriv den bøjede form..."
          />
          {showResult && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <strong>Dit svar:</strong> {selectedAnswer as string}
              </p>
              <p className="text-sm">
                <strong>Korrekte form:</strong> {question.correct_answer as string}
              </p>
              {getSpecialCharacterFeedback()}
              {question.explanation_da && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Forklaring:</strong> {question.explanation_da}
                  </p>
                </div>
              )}
              {renderAiFeedback()}
            </div>
          )}
        </div>
      );

    case 'sentence_structure':
      // Check if it has options (multiple choice for word arrangement) or requires text input (sentence restructuring)
      if (question.options && question.options.length > 0) {
        // Multiple choice for word arrangement
        return (
          <div className={`p-6 border rounded-lg ${getResultClass()}`}>
            <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    disabled ? 'cursor-not-allowed opacity-50' : ''
                  } ${
                    showResult && option === question.correct_answer
                      ? 'border-green-500 bg-green-100'
                      : showResult && selectedAnswer === option && !isCorrect()
                      ? 'border-red-500 bg-red-100'
                      : selectedAnswer === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    disabled={disabled}
                    className="mr-3"
                  />
                  {option}
                </label>
              ))}
            </div>
            {showResult && question.explanation_da && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Forklaring:</strong> {question.explanation_da}
                </p>
              </div>
            )}
            {renderAiFeedback()}
          </div>
        );
      } else {
        // Text input for sentence restructuring
        return (
          <div className={`p-6 border rounded-lg ${getResultClass()}`}>
            <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
            <textarea
              value={selectedAnswer as string}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={disabled}
              className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                disabled ? 'bg-gray-100' : ''
              } ${
                showResult
                  ? isCorrect()
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Skriv den omstrukturerede sætning her..."
            />
            {showResult && (
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <strong>Din sætning:</strong> {selectedAnswer as string}
                </p>
                <p className="text-sm">
                  <strong>Korrekt sætning:</strong> {question.correct_answer as string}
                </p>
                {getSpecialCharacterFeedback()}
                {question.explanation_da && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Forklaring:</strong> {question.explanation_da}
                    </p>
                  </div>
                )}
                {renderAiFeedback()}
              </div>
            )}
          </div>
        );
      }

    default:
      return null;
  }
}

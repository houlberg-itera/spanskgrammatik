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
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showProgressiveTip, setShowProgressiveTip] = useState(false);

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
      setWrongAttempts(0); // Reset wrong attempts for new question
      setShowProgressiveTip(false); // Reset progressive tip state
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

  // Generate progressive tips based on question type and content
  const generateProgressiveTip = () => {
    const tips: { [key: string]: string[] } = {
      multiple_choice: [
        "💡 Tip: Læs spørgsmålet igen omhyggeligt og tænk over hvad der giver mest mening.",
        "🤔 Hint: Prøv at eliminere de svar du ved er forkerte først.",
        "📝 Hjælp: Tænk på grammatikreglerne du har lært for dette emne."
      ],
      conjugation: [
        "💡 Tip: Husk på hvem der udfører handlingen - er det jeg, du, han/hun?",
        "🤔 Hint: Kontroller verbets endelse - skal den matche subjektet?",
        "📝 Hjælp: Tænk på om det er nutid, datid eller fremtid."
      ],
      fill_in_blank: [
        "💡 Tip: Se på ordene omkring det tomme felt for at forstå sammenhængen.",
        "🤔 Hint: Tænk på ordklassen - skal det være et navneord, tillægsord eller udsagnsord?",
        "📝 Hjælp: Kontroller om ordet skal bøjes eller have en bestemt endelse."
      ],
      translation: [
        "💡 Tip: Oversæt ord for ord først, og juster derefter til naturligt dansk.",
        "🤔 Hint: Husk på at ordstillingen kan være anderledes på spansk og dansk.",
        "📝 Hjælp: Tænk på de spanske grammatikregler du har lært."
      ]
    };

    const questionTypeTips = tips[question.type] || tips.multiple_choice;
    const randomTip = questionTypeTips[Math.floor(Math.random() * questionTypeTips.length)];
    
    setAiFeedback(randomTip);
  };

  // Check for wrong answer attempts when results are shown
  useEffect(() => {
    console.log('🔍 Progressive tips check:', { showResult, isCorrect: isAnswerCorrect(), wrongAttempts });
    
    if (showResult && !isAnswerCorrect()) {
      setWrongAttempts(prev => {
        const newAttempts = prev + 1;
        console.log('❌ Wrong attempt #' + newAttempts);
        
        if (newAttempts >= 2) {
          console.log('💡 Triggering progressive tip after', newAttempts, 'attempts');
          setShowProgressiveTip(true);
          // Generate tip after state is set
          setTimeout(() => generateProgressiveTip(), 0);
        }
        
        return newAttempts;
      });
    }
  }, [showResult]); // Only depend on showResult, not userAnswer

  // Helper function to render correct answer display
  const renderCorrectAnswerDisplay = () => {
    if (!showResult) return null;
    
    const isCorrect = isAnswerCorrect();
    const correctAnswerDisplay = Array.isArray(question.correct_answer) 
      ? question.correct_answer.join(', ') 
      : String(question.correct_answer);
    
    return (
      <>
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
        
        {/* Progressive Tips Section */}
        {(() => {
          const shouldShow = showProgressiveTip && !isCorrect && aiFeedback && wrongAttempts >= 2;
          console.log('💡 Progressive tip render check:', {
            showProgressiveTip,
            isCorrect,
            hasAiFeedback: !!aiFeedback,
            wrongAttempts,
            shouldShow
          });
          return shouldShow;
        })() && (
          <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Hjælp efter flere forsøg</h4>
                <p className="text-sm text-blue-700">{aiFeedback}</p>
                <div className="text-xs text-blue-600 mt-1 opacity-75">
                  Forsøg #{wrongAttempts} - Få mere hjælp hver gang du svarer forkert
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
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
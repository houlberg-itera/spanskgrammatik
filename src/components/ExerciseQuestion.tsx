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

  switch (question.type) {
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
            autoFocus={true}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Skriv den bøjede form..."
          />
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
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Skriv dit svar her..."
          />
        </div>
      );
  }
}
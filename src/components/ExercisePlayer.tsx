'use client';

import { useState, useEffect } from 'react';
import { Exercise, ExerciseAttempt } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import ExerciseQuestion from './ExerciseQuestion';
import ProgressErrorHandler from './ProgressErrorHandler';
import { useRouter } from 'next/navigation';

interface ExercisePlayerProps {
  exercise: Exercise;
  onComplete: (attempt: ExerciseAttempt) => void;
}

export default function ExercisePlayer({ exercise, onComplete }: ExercisePlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showErrorHandler, setShowErrorHandler] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ exerciseId: number; score: number } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Debug: Log exercise data when component mounts
  useEffect(() => {
    console.log('=== EXERCISE PLAYER DEBUG ===');
    console.log('Exercise received:', exercise);
    console.log('Exercise content:', exercise.content);
    console.log('Questions:', exercise.content.questions);
    console.log('Number of questions:', exercise.content.questions?.length);
    exercise.content.questions?.forEach((q, i) => {
      console.log(`Question ${i + 1}:`, {
        id: q.id,
        type: q.type,
        question_da: q.question_da,
        correct_answer: q.correct_answer,
        points: q.points,
        options: q.options
      });
    });
    console.log('=== END EXERCISE DEBUG ===');
  }, [exercise]);

  const questions = exercise.content.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '');

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const calculateScore = (): number => {
    let correct = 0;
    let total = 0;

    console.log('=== SCORE CALCULATION DEBUG ===');
    console.log('Total questions:', questions.length);
    console.log('Questions structure:', questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question_da?.substring(0, 50) + '...',
      correct_answer: q.correct_answer,
      points: q.points
    })));
    console.log('User answers:', answers);

    questions.forEach((question, index) => {
      const questionPoints = question.points || 1;
      total += questionPoints;
      const userAnswer = answers[question.id];
      
      console.log(`\n--- Question ${index + 1} (ID: ${question.id}) ---`);
      console.log('Question text:', question.question_da);
      console.log('Question type:', question.type);
      console.log('User answer:', userAnswer, '(type:', typeof userAnswer, ')');
      console.log('Correct answer:', question.correct_answer, '(type:', typeof question.correct_answer, ')');
      console.log('Points for this question:', questionPoints);
      
      if (userAnswer !== undefined && userAnswer !== '' && userAnswer !== null) {
        let isCorrect = false;
        
        if (Array.isArray(question.correct_answer)) {
          isCorrect = Array.isArray(userAnswer) 
            ? userAnswer.sort().join(',').toLowerCase() === question.correct_answer.sort().join(',').toLowerCase()
            : false;
          console.log('Array comparison logic used');
        } else {
          // Convert both to strings for comparison
          const correctAnswer = String(question.correct_answer).toLowerCase().trim();
          const givenAnswer = String(userAnswer).toLowerCase().trim();
          
          console.log(`String comparison: "${givenAnswer}" === "${correctAnswer}"`);
          
          if (question.type === 'multiple_choice') {
            // For multiple choice, direct string comparison
            isCorrect = givenAnswer === correctAnswer;
            console.log('Multiple choice comparison:', isCorrect);
          } else if (question.type === 'fill_in_blank' || question.type === 'conjugation') {
            // For fill-in-blank and conjugation, check for exact match
            isCorrect = givenAnswer === correctAnswer;
            console.log('Fill-in-blank/conjugation comparison:', isCorrect);
          } else if (question.type === 'translation') {
            // For translation, be more lenient with variations
            isCorrect = givenAnswer === correctAnswer || 
                       givenAnswer.includes(correctAnswer) || 
                       correctAnswer.includes(givenAnswer);
            console.log('Translation comparison:', isCorrect);
          } else {
            isCorrect = givenAnswer === correctAnswer;
            console.log('Default comparison:', isCorrect);
          }
        }
        
        console.log(`Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
        
        if (isCorrect) {
          correct += questionPoints;
          console.log(`Added ${questionPoints} points. Total correct points: ${correct}`);
        }
      } else {
        console.log('No answer provided for this question');
      }
    });

    const finalScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    console.log(`\n=== FINAL CALCULATION ===`);
    console.log(`Correct points: ${correct}`);
    console.log(`Total points: ${total}`);
    console.log(`Percentage: ${correct}/${total} = ${finalScore}%`);
    console.log('=== END SCORE CALCULATION ===\n');
    
    return finalScore;
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);

    try {
      // Enhanced debugging and validation
      console.log('=== PROGRESS SAVING DEBUG ===');
      console.log('Exercise ID:', exercise.id);
      console.log('Final Score:', finalScore);
      console.log('Exercise object:', exercise);
      
      // Validate exercise data
      if (!exercise || !exercise.id) {
        console.error('Invalid exercise data:', exercise);
        throw new Error('Øvelse data er ugyldig - mangler ID');
      }

      if (typeof finalScore !== 'number' || finalScore < 0 || finalScore > 100) {
        console.error('Invalid score:', finalScore);
        throw new Error('Ugyldig score beregning');
      }

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Autentifikationsfejl: ' + authError.message);
      }

      if (!user) {
        console.error('No authenticated user found');
        throw new Error('Du skal være logget ind for at gemme fremgang');
      }

      console.log('Authenticated user:', user.id);
      console.log('Saving progress directly to database:', {
        exercise_id: exercise.id,
        score: finalScore
      });

      // Save progress using direct database operations (bypassing problematic RPC function)
      // First check if progress already exists
      const { data: existingProgress, error: checkError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exercise.id)
        .single();

      let saveResult;
      let operation = existingProgress ? 'update' : 'insert';

      if (existingProgress) {
        // Update existing progress
        console.log('Updating existing progress...');
        const { data, error } = await supabase
          .from('user_progress')
          .update({
            score: finalScore,
            completed: finalScore >= 70,
            attempts: (existingProgress.attempts || 0) + 1,
            completed_at: finalScore >= 70 ? new Date().toISOString() : existingProgress.completed_at,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('exercise_id', exercise.id)
          .select();
        
        saveResult = { data, error };
      } else {
        // Insert new progress using only schema-compliant columns
        console.log('Inserting new progress...');
        const { data, error } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            exercise_id: exercise.id,
            completed: finalScore >= 70,
            score: finalScore,
            attempts: 1,
            completed_at: finalScore >= 70 ? new Date().toISOString() : null
          })
          .select();
        
        saveResult = { data, error };
      }

      if (saveResult.error) {
        console.error('Direct database save error:', saveResult.error);
        console.error('Error code:', saveResult.error.code);
        console.error('Error message:', saveResult.error.message);
        console.error('Error details:', saveResult.error.details);
        
        // Provide more specific error messages
        let errorMessage = 'Der opstod en fejl ved at gemme din fremgang.';
        
        if (saveResult.error.code === 'PGRST116') {
          errorMessage = 'Database funktion ikke fundet. Kontakt support.';
        } else if (saveResult.error.code === '42883') {
          errorMessage = 'Database konfigurationsfejl. Kontakt support.';
        } else if (saveResult.error.message.includes('permission denied')) {
          errorMessage = 'Du har ikke tilladelse til at gemme fremgang. Prøv at logge ind igen.';
        } else if (saveResult.error.message.includes('auth')) {
          errorMessage = 'Autentifikationsproblem. Prøv at logge ind igen.';
        } else if (saveResult.error.message.includes('network')) {
          errorMessage = 'Netværksproblem. Tjek din internetforbindelse og prøv igen.';
        }
        
        throw new Error(errorMessage + ' (Teknisk fejl: ' + saveResult.error.message + ')');
      }
      
      console.log('Progress saved successfully:', saveResult.data);
      console.log('Operation:', operation);
      console.log('=== END PROGRESS SAVING DEBUG ===');

      const attempt: ExerciseAttempt = {
        exerciseId: exercise.id,
        answers,
        score: finalScore,
        completedAt: new Date().toISOString(),
      };

      onComplete(attempt);
    } catch (error) {
      console.error('Error in handleFinish:', error);
      
      // Store error details for the error handler
      setErrorDetails({
        exerciseId: exercise.id,
        score: finalScore
      });
      
      // Still show the exercise completion, but with error notice
      const attempt: ExerciseAttempt = {
        exerciseId: exercise.id,
        answers,
        score: finalScore,
        completedAt: new Date().toISOString(),
      };

      // Complete the exercise locally even if saving failed
      onComplete(attempt);
      
      // Show the enhanced error handler after a brief delay
      setTimeout(() => {
        setShowErrorHandler(true);
      }, 1000);
      
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
  };

  const handleBackToLevel = () => {
    router.push(`/level/${exercise.level.toLowerCase()}`);
  };

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Øvelse afsluttet!</h2>
            <div className={`text-6xl font-bold mb-4 ${score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
              {score}%
            </div>
            <p className="text-lg text-gray-600">
              {score >= 70 
                ? 'Godt klaret! Du har bestået øvelsen.' 
                : 'Prøv igen for at forbedre dit resultat.'}
            </p>
          </div>

          {/* Review all questions */}
          <div className="space-y-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900">Gennemgang af svar:</h3>
            {questions.map((question, index) => (
              <ExerciseQuestion
                key={question.id}
                question={question}
                onAnswer={() => {}} // No-op since we're just reviewing
                userAnswer={answers[question.id]}
                showResult={true}
                disabled={true}
              />
            ))}
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Prøv igen
            </button>
            <button
              onClick={handleBackToLevel}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Tilbage til niveau
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{exercise.title_da}</h1>
            <span className="text-sm text-gray-500">
              Spørgsmål {currentQuestionIndex + 1} af {questions.length}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Instructions */}
        {exercise.content.instructions_da && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800">{exercise.content.instructions_da}</p>
          </div>
        )}

        {/* Current Question */}
        <div className="mb-8">
          <ExerciseQuestion
            question={currentQuestion}
            onAnswer={handleAnswer}
            userAnswer={answers[currentQuestion.id]}
            level={exercise.level}
            enableAiFeedback={true}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Forrige
          </button>

          <div className="text-sm text-gray-600">
            {Object.keys(answers).length} af {questions.length} besvaret
          </div>

          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id] || answers[currentQuestion.id] === ''}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Gemmer...' : isLastQuestion ? 'Afslut øvelse' : 'Næste'}
          </button>
        </div>

        {/* Show finish button if all questions answered */}
        {allQuestionsAnswered && !isLastQuestion && (
          <div className="mt-4 text-center">
            <button
              onClick={handleFinish}
              className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Afslut øvelse nu
            </button>
          </div>
        )}
      </div>

      {/* Progress Error Handler */}
      {showErrorHandler && errorDetails && (
        <ProgressErrorHandler
          exerciseId={errorDetails.exerciseId}
          score={errorDetails.score}
          onRetrySuccess={() => {
            setShowErrorHandler(false);
            setErrorDetails(null);
          }}
          onCancel={() => {
            setShowErrorHandler(false);
            setErrorDetails(null);
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Exercise, ExerciseAttempt } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import ExerciseQuestion from './ExerciseQuestion';
import ProgressErrorHandler from './ProgressErrorHandler';
import { useRouter } from 'next/navigation';

// Helper function to update level progress
async function updateLevelProgress(userId: string, level: string, supabase: any) {
  console.log(`🔄 Updating level progress for user ${userId}, level ${level}`);
  
  // Get all exercises for this level
  const { data: levelExercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id')
    .eq('level', level);

  if (exercisesError || !levelExercises) {
    console.error('❌ Error fetching level exercises:', exercisesError);
    return;
  }

  console.log(`📊 Found ${levelExercises.length} exercises for level ${level}`);
  const exerciseIds = levelExercises.map(ex => ex.id);
  
  // Get user's completed exercises for this level
  const { data: userProgress, error: progressError } = await supabase
    .from('user_progress')
    .select('exercise_id, completed, score')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds);

  if (progressError) {
    console.error('❌ Error fetching user progress:', progressError);
    return;
  }

  console.log(`📈 User has progress on ${userProgress?.length || 0} exercises for level ${level}`);

  // Calculate completion stats
  const totalExercises = exerciseIds.length;
  const completedExercises = userProgress?.filter(p => p.completed).length || 0;
  const averageScore = userProgress?.length > 0 
    ? userProgress.reduce((sum, p) => sum + (p.score || 0), 0) / userProgress.length 
    : 0;
  const progressPercentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  console.log(`📊 Progress calculation: ${completedExercises}/${totalExercises} (${progressPercentage}%), avg score: ${averageScore.toFixed(1)}`);

  // Update or insert level progress
  const { data: existingLevelProgress } = await supabase
    .from('user_level_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('level', level)
    .single();

  if (existingLevelProgress) {
    // Update existing level progress
    console.log(`✏️ Updating existing level progress for ${level}`);
    const { error: updateError } = await supabase
      .from('user_level_progress')
      .update({
        progress_percentage: progressPercentage,
        completed_at: progressPercentage >= 100 ? new Date().toISOString() : null
      })
      .eq('user_id', userId)
      .eq('level', level);
      
    if (updateError) {
      console.error('❌ Error updating level progress:', updateError);
    } else {
      console.log(`✅ Successfully updated level progress for ${level}: ${progressPercentage}%`);
    }
  } else {
    // Insert new level progress
    console.log(`➕ Creating new level progress for ${level}`);
    const { error: insertError } = await supabase
      .from('user_level_progress')
      .insert({
        user_id: userId,
        level: level,
        progress_percentage: progressPercentage,
        completed_at: progressPercentage >= 100 ? new Date().toISOString() : null
      });
      
    if (insertError) {
      console.error('❌ Error inserting level progress:', insertError);
    } else {
      console.log(`✅ Successfully created level progress for ${level}: ${progressPercentage}%`);
    }
  }
}

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

  // Debug logging to see exercise structure
  console.log('🔍 ExercisePlayer received exercise:', exercise);
  console.log('🔍 Exercise content:', exercise?.content);
  console.log('🔍 Exercise content type:', typeof exercise?.content);

  // Add null checks for exercise content
  let questions = [];
  
  // Handle different exercise content structures
  if (exercise?.content?.questions) {
    // New format: content.questions array
    questions = exercise.content.questions;
    console.log('🔍 Using content.questions format');
  } else if (Array.isArray(exercise?.content)) {
    // Direct array format
    questions = exercise.content;
    console.log('🔍 Using direct array format');
  } else if ((exercise as any)?.questions) {
    // Questions directly on exercise object
    questions = (exercise as any).questions;
    console.log('🔍 Using exercise.questions format');
  } else if (exercise?.content && typeof exercise.content === 'object') {
    // Old vocabulary format: single question object
    const content = exercise.content as any;
    if (content.question_da || content.question_es) {
      // Convert old vocabulary format to questions array
      // Determine the question type based on the content structure
      let questionType = 'multiple_choice'; // default
      
      if (content.options && Array.isArray(content.options) && content.options.length > 0) {
        // Has multiple choice options
        questionType = 'multiple_choice';
      } else if (content.question_da && content.correct_answer && !content.options) {
        // No options provided - likely a translation or fill-in-blank exercise
        // Check if it's asking for translation based on question text
        const questionText = content.question_da.toLowerCase();
        if (questionText.includes('oversæt') || questionText.includes('translate') || 
            questionText.includes('dansk til spansk') || questionText.includes('spansk til dansk') ||
            questionText.includes('oversættelse')) {
          questionType = 'translation';
        } else {
          // For vocabulary exercises, if the question contains a complete Danish sentence
          // and expects a Spanish answer, it's likely a translation exercise
          const words = questionText.split(' ').length;
          if (words > 3 && content.correct_answer) {
            // Check if the correct answer is in Spanish (contains Spanish characters or common Spanish words)
            const correctAnswer = content.correct_answer.toLowerCase();
            const spanishIndicators = ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', 'bebo', 'agua', 'como', 'tengo', 'soy', 'es', 'está'];
            const isSpanishAnswer = spanishIndicators.some(indicator => correctAnswer.includes(indicator));
            
            if (isSpanishAnswer) {
              questionType = 'translation';
            } else {
              questionType = 'fill_blank';
            }
          } else {
            questionType = 'fill_blank';
          }
        }
      }
      
      const question = {
        id: '1',
        type: questionType,
        question_da: content.question_da,
        question_es: content.question_es,
        options: content.options || [],
        correct_answer: content.correct_answer,
        explanation_da: content.explanation_da,
        explanation_es: content.explanation_es,
        points: 1
      };
      questions = [question];
      console.log('🔍 Converted old vocabulary format to questions array with type:', questionType);
      console.log('🔍 Question text:', content.question_da);
      console.log('🔍 Expected answer:', content.correct_answer);
    }
  }
  
  console.log('🔍 Parsed questions:', questions);
  console.log('🔍 Questions length:', questions?.length);
  
  // Early return if no questions
  if (!questions || questions.length === 0) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Øvelse fejl</h3>
        <p className="text-red-600">Denne øvelse har ingen spørgsmål. Kontakt en administrator.</p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-red-500">Debug info (klik for at se)</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(exercise, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '');

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

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

  const calculateScore = (): number => {
    let correct = 0;
    let total = 0;

    questions.forEach((question) => {
      const questionPoints = question.points || 1;
      total += questionPoints;
      const userAnswer = answers[question.id];
      
      if (userAnswer !== undefined && userAnswer !== '' && userAnswer !== null) {
        let isCorrect = false;
        
        if (Array.isArray(question.correct_answer)) {
          isCorrect = Array.isArray(userAnswer) 
            ? userAnswer.sort().join(',').toLowerCase() === question.correct_answer.sort().join(',').toLowerCase()
            : false;
        } else {
          // Use enhanced comparison with special character handling
          const correctAnswer = String(question.correct_answer);
          const givenAnswer = String(userAnswer);
          
          if (question.type === 'multiple_choice') {
            isCorrect = compareAnswers(givenAnswer, correctAnswer);
          } else if (question.type === 'fill_in_blank' || question.type === 'conjugation') {
            isCorrect = compareAnswers(givenAnswer, correctAnswer);
          } else if (question.type === 'translation') {
            // For translation, use enhanced comparison first, then fallback to partial matches
            isCorrect = compareAnswers(givenAnswer, correctAnswer);
            if (!isCorrect) {
              // Fallback to partial matching for translations
              const normalizedGiven = normalizeText(givenAnswer);
              const normalizedCorrect = normalizeText(correctAnswer);
              isCorrect = normalizedGiven.includes(normalizedCorrect) || 
                         normalizedCorrect.includes(normalizedGiven);
            }
          } else {
            isCorrect = compareAnswers(givenAnswer, correctAnswer);
          }
        }
        
        if (isCorrect) {
          correct += questionPoints;
        }
      }
    });

    const finalScore = total > 0 ? Math.round((correct / total) * 100) : 0;
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
      // Validate exercise data
      if (!exercise || !exercise.id) {
        throw new Error('Øvelse data er ugyldig - mangler ID');
      }

      if (typeof finalScore !== 'number' || finalScore < 0 || finalScore > 100) {
        throw new Error('Ugyldig score beregning');
      }

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error('Autentifikationsfejl: ' + authError.message);
      }

      if (!user) {
        throw new Error('Du skal være logget ind for at gemme fremgang');
      }

      // First try using the RPC function for atomic operation
      console.log(`🔄 Attempting to save exercise ${exercise.id} with score ${finalScore} using RPC function`);
      let saveResult: any;
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('update_user_progress', {
          exercise_id_param: exercise.id,
          score_param: finalScore
        });

      if (rpcError) {
        console.log(`⚠️ RPC function failed (${rpcError.code}): ${rpcError.message}`);
        console.log(`🔄 Falling back to direct database operations`);
        
        // RPC function failed, use direct database operations
        const { data: existingProgress } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('exercise_id', exercise.id)
          .single();

        if (existingProgress) {
          // Update existing progress
          console.log(`✏️ Updating existing progress for exercise ${exercise.id}`);
          const { data, error } = await supabase
            .from('user_progress')
            .update({
              score: Math.max(existingProgress.score || 0, finalScore),
              completed: Math.max(existingProgress.score || 0, finalScore) >= 70,
              attempts: (existingProgress.attempts || 0) + 1,
              completed_at: Math.max(existingProgress.score || 0, finalScore) >= 70 ? new Date().toISOString() : existingProgress.completed_at,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('exercise_id', exercise.id)
            .select();
          
          saveResult = { data, error };
        } else {
          // Insert new progress
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
      } else {
        saveResult = { data: rpcResult, error: rpcError };
      }

      // Always update level progress to ensure dashboard stays in sync
      if (!saveResult?.error) {
        console.log(`🔄 Exercise completed successfully, updating level progress for ${exercise.level}`);
        await updateLevelProgress(user.id, exercise.level, supabase);
      } else {
        console.error('❌ Not updating level progress due to save error:', saveResult.error);
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

      const attempt: ExerciseAttempt = {
        exerciseId: exercise.id,
        answers,
        score: finalScore,
        completedAt: new Date().toISOString(),
      };

      onComplete(attempt);
    } catch (error) {
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
            key={currentQuestion.id} // Force re-render when question changes
            question={currentQuestion}
            onAnswer={handleAnswer}
            userAnswer={answers[currentQuestion.id]}
            level={exercise.level}
            enableAiFeedback={true}
            showResult={showResults}
            disabled={false}
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
            {Object.values(answers).filter(answer => answer !== undefined && answer !== '' && answer !== null).length} af {questions.length} besvaret
          </div>

          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id] || answers[currentQuestion.id] === '' || answers[currentQuestion.id] === null}
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

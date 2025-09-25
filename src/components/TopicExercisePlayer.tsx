'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Exercise {
  id: number;
  question_da: string;
  question_es: string;
  correct_answer: string;
  options?: string[];
  type: string;
}

interface Topic {
  id: string;
  name_da: string;
  description_da: string;
  level: string;
}

export default function TopicExercisePlayer({ 
  topicId, 
  retryMode = false,
  wrongAnswerExerciseIds = []
}: { 
  topicId: string;
  retryMode?: boolean;
  wrongAnswerExerciseIds?: string[];
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]); // Track all exercises for mastery calculation
  const [wrongAnswers, setWrongAnswers] = useState<Set<number>>(new Set()); // Track wrong answers in current session
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchExercises();
  }, [topicId]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      // Always fetch all exercises for mastery tracking
      const { data: allData, error: allError } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .order('id', { ascending: true });
      
      if (allError) throw allError;
      setAllExercises(allData || []);

      // If in retry mode, filter to only show previously wrong exercises
      let exercisesToShow = allData || [];
      if (retryMode && wrongAnswerExerciseIds.length > 0) {
        exercisesToShow = allData?.filter(exercise => 
          wrongAnswerExerciseIds.map(id => parseInt(id, 10)).includes(exercise.id)
        ) || [];
      }

      setExercises(exercisesToShow);
      // Set initial progress based on current mode
      const totalForProgress = retryMode ? wrongAnswerExerciseIds.length : allData?.length || 0;
      setProgress(totalForProgress > 0 ? (1 / totalForProgress) * 100 : 0);
      
      // Initialize progress display message
      if (retryMode && wrongAnswerExerciseIds.length > 0) {
        console.log(`Starting retry mode with ${wrongAnswerExerciseIds.length} questions to master`);
      }
    } catch (err) {
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    const correct = normalizeText(userAnswer) === normalizeText(exercises[currentIndex].correct_answer);
    setIsCorrect(correct);
    setShowContinue(true);

    // Track wrong answers for mastery system
    if (!correct) {
      setWrongAnswers(prev => new Set([...prev, exercises[currentIndex].id]));
    } else if (retryMode) {
      // If in retry mode and answered correctly, remove from wrong answers
      setWrongAnswers(prev => {
        const newSet = new Set(prev);
        newSet.delete(exercises[currentIndex].id);
        return newSet;
      });
    }

    saveProgress(currentIndex, correct);
  };

  const handleContinue = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowContinue(false);
    
    if (currentIndex < exercises.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const totalForProgress = retryMode ? wrongAnswerExerciseIds.length : exercises.length;
      setProgress(((nextIndex + 1) / totalForProgress) * 100);
    } else {
      // All current questions completed - check mastery status
      setProgress(100);
      
      if (retryMode) {
        // In retry mode: check if any wrong answers remain
        if (wrongAnswers.size === 0) {
          // All previously wrong questions now correct - topic mastered!
          router.push('/dashboard?message=topic-mastered');
        } else {
          // Still have wrong answers in current session - offer another retry
          router.push('/dashboard?message=retry-available');
        }
      } else {
        // Initial attempt: check if any wrong answers exist
        if (wrongAnswers.size === 0) {
          // Perfect score - topic mastered!
          router.push('/dashboard?message=topic-mastered');
        } else {
          // Some wrong answers - offer retry mode
          router.push(`/dashboard?message=needs-retry&topicId=${topicId}&wrongAnswers=${Array.from(wrongAnswers).join(',')}`);
        }
      }
    }
  };

  const handleStop = () => {
    router.push('/dashboard');
  };

  const saveProgress = async (index: number, correct: boolean) => {
    // Save user progress to Supabase using correct user_progress table
    console.log('🔥 STARTING PROGRESS SAVE OPERATION');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No session found - aborting save');
        return;
      }

      console.log('✅ Session found, user_id:', session.user.id);
      console.log('📝 Saving progress for:', {
        user_id: session.user.id,
        exercise_id: exercises[index].id,
        correct,
        userAnswer,
        correctAnswer: exercises[index].correct_answer,
        question_text: exercises[index].question_da
      });

      // First, get existing progress to preserve question_results array
      console.log('📊 Fetching existing progress for exercise:', exercises[index].id);
      const { data: existingProgress, error: fetchError } = await supabase
        .from('user_progress')
        .select('question_results')
        .eq('user_id', session.user.id)
        .eq('exercise_id', exercises[index].id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing progress:', fetchError);
      } else {
        console.log('📋 Existing progress found:', existingProgress);
      }

      // Create new question result object
      const newQuestionResult = {
        question_id: exercises[index].id, // ✅ ESSENTIAL: Include question/exercise ID
        question_text: exercises[index].question_da,
        correct: correct,
        userAnswer: userAnswer,
        correctAnswer: exercises[index].correct_answer,
        timestamp: new Date().toISOString()
      };
      console.log('🆕 Created new question result:', newQuestionResult);

      // Track mastery progress
      if (!correct) {
        wrongAnswers.add(exercises[index].id);
        console.log(`❌ Wrong answer tracked for exercise ${exercises[index].id}. Total wrong: ${wrongAnswers.size}`);
      } else if (retryMode) {
        // In retry mode, correct answers remove from wrongAnswers set
        wrongAnswers.delete(exercises[index].id);
        console.log(`✅ Correct answer in retry mode! Removed ${exercises[index].id}. Remaining wrong: ${wrongAnswers.size}`);
      }

      // Get existing question results array or start with empty array
      let questionResults = [];
      if (existingProgress?.question_results) {
        // If existing data is array, use it; if single object, convert to array
        if (Array.isArray(existingProgress.question_results)) {
          questionResults = existingProgress.question_results;
          console.log('📋 Using existing array of', questionResults.length, 'questions');
        } else {
          questionResults = [existingProgress.question_results];
          console.log('🔄 Converting single object to array format');
        }
      } else {
        console.log('🆕 Starting with empty question results array');
      }

      // Append new question result
      questionResults.push(newQuestionResult);
      console.log('➕ Added new question, total questions now:', questionResults.length);

      const upsertData = {
        user_id: session.user.id,
        exercise_id: exercises[index].id,
        completed: correct,
        score: correct ? 100 : 0,
        attempts: 1,
        completed_at: correct ? new Date().toISOString() : null,
        question_results: questionResults  // Now an array of all answered questions
      };

      console.log('💾 ATTEMPTING UPSERT with data:', upsertData);

      const { data: upsertResult, error: upsertError } = await supabase
        .from('user_progress')
        .upsert(upsertData, {
          onConflict: 'user_id,exercise_id'
        });

      if (upsertError) {
        console.error('❌ UPSERT ERROR:', {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        });
        throw upsertError;
      }

      console.log('✅ PROGRESS SAVED SUCCESSFULLY!');
      console.log('📊 Final question results array length:', questionResults.length);
      console.log('🎯 Upsert result:', upsertResult);
      
    } catch (err: any) {
      console.error('💥 ERROR IN SAVE PROGRESS:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        status: err.status,
        statusText: err.statusText
      });
      
      // Log additional error context
      if (err.status === 406) {
        console.error('🚨 HTTP 406 (Not Acceptable) - Server rejected request format');
      } else if (err.status === 409) {
        console.error('🚨 HTTP 409 (Conflict) - Data conflict during upsert');
      }
    }
  };

  function normalizeText(text: string) {
    return text.toLowerCase().trim().replace(/[áàâäã]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôöõ]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n').replace(/ç/g, 'c').replace(/[.,!?;:'"()[\]{}]/g, '').replace(/\s+/g, ' ').trim();
  }

  if (loading) {
    return <div className="p-8 text-center">Loading exercises...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  if (exercises.length === 0) {
    return <div className="p-8 text-center">No exercises found for this topic.</div>;
  }

  const exercise = exercises[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Topic Exercise Player</h2>
          <button onClick={handleStop} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Stop & Back to Dashboard</button>
        </div>
        <div className="mb-4">
          <div className="text-gray-700 mb-2">Progress: {Math.round(progress)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="mb-6">
          <div className="font-medium text-gray-900 mb-2">
            {retryMode 
              ? `Retry Question ${currentIndex + 1} of ${exercises.length} (Review wrong answers)`
              : `Question ${currentIndex + 1} of ${exercises.length}`
            }
          </div>
          <div className="text-lg mb-4">{exercise.question_da}</div>
          {exercise.options && exercise.options.length > 0 ? (
            <div className="space-y-2 mb-4">
              {exercise.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`block w-full px-4 py-2 border rounded-lg text-left ${normalizeText(userAnswer) === normalizeText(opt) ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-300'}`}
                  onClick={() => setUserAnswer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Skriv dit svar her..."
            />
          )}
          <button
            onClick={handleCheckAnswer}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={userAnswer === '' || isCorrect !== null}
          >
            Check Answer
          </button>
          {isCorrect === true && (
            <div className="mt-4 text-green-600 font-semibold">Correct! 🎉</div>
          )}
          {isCorrect === false && (
            <div className="mt-4 text-red-600 font-semibold">
              Incorrect. The correct answer was: <span className="font-bold">{exercise.correct_answer}</span>
            </div>
          )}
          
          {/* Mastery Status Display */}
          {retryMode && wrongAnswers.size > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm">
                <span className="font-semibold">Retry Mode:</span> {wrongAnswers.size} question{wrongAnswers.size === 1 ? '' : 's'} still need{wrongAnswers.size === 1 ? 's' : ''} to be answered correctly
              </p>
            </div>
          )}
          
          {showContinue && (
            <button
              onClick={handleContinue}
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {currentIndex < exercises.length - 1 
                ? 'Continue to Next Question' 
                : retryMode 
                  ? (wrongAnswers.size === 0 ? 'Complete Mastery!' : 'Finish Retry Session')
                  : (wrongAnswers.size === 0 ? 'Complete Topic!' : 'Finish for Now')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
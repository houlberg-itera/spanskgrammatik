'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Exercise {
  id: string;
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

export default function TopicExercisePlayer({ topicId }: { topicId: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
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
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .order('id', { ascending: true });
      if (error) throw error;
      setExercises(data || []);
      setProgress(0);
    } catch (err) {
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    const correct = normalizeText(userAnswer) === normalizeText(exercises[currentIndex].correct_answer);
    setIsCorrect(correct);
    setShowContinue(correct);
    saveProgress(currentIndex, correct);
  };

  const handleContinue = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowContinue(false);
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(((currentIndex + 2) / exercises.length) * 100);
    } else {
      setProgress(100);
      router.push('/dashboard');
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
          <div className="font-medium text-gray-900 mb-2">Question {currentIndex + 1} of {exercises.length}</div>
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
            <div className="mt-4 text-red-600 font-semibold">Incorrect. Try again!</div>
          )}
          {showContinue && (
            <button
              onClick={handleContinue}
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
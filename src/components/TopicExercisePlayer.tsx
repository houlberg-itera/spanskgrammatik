'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
    // Save user progress to Supabase (can be expanded for more details)
    try {
      await supabase.from('user_exercise_results').upsert({
        exercise_id: exercises[index].id,
        correct,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Ignore errors for now
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
          <button onClick={handleStop} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center gap-2">
            <Image src="/duck.png" alt="Duck" width={16} height={16} />
            Stop & Back to Dashboard
          </button>
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
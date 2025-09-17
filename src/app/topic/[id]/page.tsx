'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress } from '@/types/database';
import Link from 'next/link';

interface QuestionWithExercise {
  questionId: string;
  exerciseId: number;
  exerciseTitle: string;
  question_da: string;
  question_es?: string;
  correct_answer: string | string[];
  options?: string[];
  explanation_da?: string;
  explanation_es?: string;
  type: string;
}

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = parseInt(params.id as string);
  
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<QuestionWithExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  
  const supabase = createClient();

  useEffect(() => {
    if (!topicId || isNaN(topicId)) {
      router.push('/dashboard');
      return;
    }
    
    checkAuth();
    fetchTopicData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }
  };

  const fetchTopicData = async () => {
    try {
      // Get topic details
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError) {
        throw new Error(`Topic error: ${topicError.message}`);
      }

      if (!topicData) {
        setError('Emne ikke fundet');
        return;
      }

      setTopic(topicData);

      // Get exercises for this topic
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

      if (exercisesError) {
        throw new Error(`Exercises error: ${exercisesError.message}`);
      }

      // Extract all questions from all exercises into a flat array
      const allQuestions: QuestionWithExercise[] = [];
      if (exercisesData) {
        for (const exercise of exercisesData) {
          if (exercise.content && exercise.content.questions) {
            for (const question of exercise.content.questions) {
              allQuestions.push({
                questionId: question.id,
                exerciseId: exercise.id,
                exerciseTitle: exercise.title_da,
                question_da: question.question_da,
                question_es: question.question_es,
                correct_answer: question.correct_answer,
                options: question.options,
                explanation_da: question.explanation_da,
                explanation_es: question.explanation_es,
                type: question.type
              });
            }
          }
        }
      }

      setQuestions(allQuestions);

      // Get user's completed exercises count for this topic
      const { data: { session } } = await supabase.auth.getSession();
      if (session && exercisesData) {
        const exerciseIds = exercisesData.map(ex => ex.id);
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('exercise_id')
          .eq('user_id', session.user.id)
          .eq('completed', true)
          .in('exercise_id', exerciseIds);

        if (!progressError) {
          setCompletedCount(progressData?.length || 0);
        }
      }

    } catch (error) {
      console.error('Error fetching topic data:', error);
      setError(`Kunne ikke indlæse emnet: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[áàâäã]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      .replace(/[.,!?;:'"()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleCheckAnswer = () => {
    const currentQuestion = questions[currentIndex];
    const correct = normalizeText(userAnswer) === normalizeText(Array.isArray(currentQuestion.correct_answer) ? currentQuestion.correct_answer[0] : currentQuestion.correct_answer);
    setIsCorrect(correct);
    setShowContinue(correct);
    
    if (correct) {
      saveProgress(currentQuestion.exerciseId, true);
    }
  };

  const handleContinue = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setIsCorrect(null);
      setShowContinue(false);
      setCompletedCount(prev => prev + 1);
    } else {
      // All questions completed
      router.push('/dashboard');
    }
  };

  const handleStop = () => {
    router.push('/dashboard');
  };

  const saveProgress = async (exerciseId: number, correct: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('user_progress')
        .upsert({
          user_id: session.user.id,
          exercise_id: exerciseId,
          completed: correct,
          score: correct ? 100 : 0,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,exercise_id'
        });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const getProgressPercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round(((completedCount + currentIndex) / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser øvelser...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fejl</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Tilbage til dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Emne ikke fundet</h1>
          <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Tilbage til dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ingen øvelser endnu</h1>
          <p className="text-gray-600 mb-6">
            Der er ikke oprettet øvelser for dette emne endnu.
          </p>
          <div className="space-x-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Tilbage til dashboard
            </Link>
            <Link 
              href="/admin/exercise-generator"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generer øvelser
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main Duolingo-style exercise interface
  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleStop}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{topic.name_da}</span>
                  <span>{currentIndex + 1} af {questions.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {getProgressPercentage()}% fuldført
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Question */}
          <div className="mb-8">
            <div className="text-sm text-gray-500 mb-2">Oversæt til spansk</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentQuestion.question_da}
            </h2>
            {currentQuestion.question_es && (
              <div className="text-sm text-gray-600 italic">
                Hint: {currentQuestion.question_es}
              </div>
            )}
          </div>

          {/* Answer Input */}
          <div className="mb-6">
            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              // Multiple choice
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`w-full p-4 border-2 rounded-xl text-left font-medium transition-all ${
                      normalizeText(userAnswer) === normalizeText(option)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    } ${isCorrect !== null ? 'pointer-events-none' : ''}`}
                    onClick={() => setUserAnswer(option)}
                    disabled={isCorrect !== null}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              // Text input
              <div>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Skriv dit svar på spansk..."
                  disabled={isCorrect !== null}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && userAnswer.trim() && isCorrect === null) {
                      handleCheckAnswer();
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Feedback */}
          {isCorrect === true && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Rigtig! 🎉
              </div>
              {currentQuestion.explanation_da && (
                <p className="text-green-600 text-sm">
                  {currentQuestion.explanation_da}
                </p>
              )}
            </div>
          )}

          {isCorrect === false && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Ikke helt rigtigt
              </div>
              <p className="text-red-600 text-sm mb-2">
                Det rigtige svar er: <strong>{Array.isArray(currentQuestion.correct_answer) ? currentQuestion.correct_answer[0] : currentQuestion.correct_answer}</strong>
              </p>
              {currentQuestion.explanation_da && (
                <p className="text-red-600 text-sm">
                  {currentQuestion.explanation_da}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {isCorrect === null ? (
              <button
                onClick={handleCheckAnswer}
                disabled={!userAnswer.trim()}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  userAnswer.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Tjek svar
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className="flex-1 py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
              >
                {currentIndex < questions.length - 1 ? 'Fortsæt' : 'Afslut'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
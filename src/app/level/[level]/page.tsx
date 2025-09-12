'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';
import Link from 'next/link';
import ArticleTip from '@/components/ArticleTip';

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const level = (params.level as string)?.toUpperCase() as SpanishLevel;
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [generatingExercise, setGeneratingExercise] = useState<number | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (!level || !['A1', 'A2', 'B1'].includes(level)) {
      router.push('/dashboard');
      return;
    }
    
    checkAuth();
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Refresh data when the page becomes visible (user returns from an exercise)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing data...');
        fetchData();
      }
    };

    const handleFocus = () => {
      console.log('Window focused, refreshing data...');
      fetchData();
    };

    // Also refresh when the component mounts (in case we're navigating back)
    const handleRouteChange = () => {
      console.log('Route changed, refreshing data...');
      setTimeout(fetchData, 100); // Small delay to ensure the page is ready
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleRouteChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleRouteChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }
    setUser(session.user);
  };

  const fetchData = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      // Fetch topics for this level
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('level', level)
        .order('order_index');

      if (topicsData) {
        setTopics(topicsData);
      }

      // Fetch exercises for this level
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')
        .eq('level', level);

      if (exercisesData) {
        setExercises(exercisesData);
      }

      // Fetch user progress
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', currentUser.id);

        if (progressData) {
          setUserProgress(progressData);
          console.log('User progress loaded:', progressData.length, 'entries');
          console.log('Progress data:', progressData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTopicExercises = (topicId: number) => {
    return exercises.filter(ex => ex.topic_id === topicId);
  };

  const getExerciseProgress = (exerciseId: number) => {
    return userProgress.find(p => p.exercise_id === exerciseId);
  };

  const getTopicProgress = (topicId: number) => {
    const topicExercises = getTopicExercises(topicId);
    if (topicExercises.length === 0) return 0;
    
    const completedExercises = topicExercises.filter(ex => {
      const progress = getExerciseProgress(ex.id);
      return progress && progress.completed;
    });
    
    const progressPercent = Math.round((completedExercises.length / topicExercises.length) * 100);
    
    // Debug logging (remove in production)
    console.log(`Topic ${topicId}: ${completedExercises.length}/${topicExercises.length} completed (${progressPercent}%)`);
    
    return progressPercent;
  };

  // AI Exercise generation removed for end users - now admin-only
  // const generateAIExercise = async (topicId: number, exerciseType: string) => {
  //   setGeneratingExercise(topicId);
  //   try {
  //     const response = await fetch('/api/generate-exercise', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         topicId,
  //         exerciseType,
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to generate exercise');
  //     }

  //     const data = await response.json();
      
  //     // Refresh exercises to include the new one
  //     await fetchData();
      
  //     // Navigate to the new exercise
  //     router.push(`/exercise/${data.exercise.id}`);
  //   } catch (error) {
  //     console.error('Error generating AI exercise:', error);
  //     alert('Kunne ikke generere AI-øvelse. Prøv igen senere.');
  //   } finally {
  //     setGeneratingExercise(null);
  //   }
  // };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700"
              >
                ← Tilbage til dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Niveau {level}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Emner og øvelser</h2>
              <p className="text-lg text-gray-600">
                Vælg et emne for at begynde med øvelser på niveau {level}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              title="Opdater fremgang"
            >
              {refreshing ? '🔄 Opdaterer...' : '🔄 Opdater'}
            </button>
          </div>
        </div>

        {/* Article Learning Tip */}
        <ArticleTip level={level} />

        {/* Topics */}
        <div className="space-y-8">
          {topics.map((topic) => {
            const topicExercises = getTopicExercises(topic.id);
            const topicProgress = getTopicProgress(topic.id);

            return (
              <div key={topic.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {topic.name_da}
                    </h3>
                    <p className="text-gray-600">{topic.description_da}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{topicProgress}%</div>
                    <div className="text-sm text-gray-500">Afsluttet</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${topicProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Exercises */}
                {topicExercises.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topicExercises.map((exercise) => {
                      const progress = getExerciseProgress(exercise.id);
                      const isCompleted = progress && progress.completed;
                      const hasAttempted = progress && progress.attempts > 0;

                      return (
                        <Link
                          key={exercise.id}
                          href={`/exercise/${exercise.id}`}
                          className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {exercise.title_da}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {isCompleted && (
                                <span className="text-green-500 text-sm">✓</span>
                              )}
                              {hasAttempted && !isCompleted && (
                                <span className="text-yellow-500 text-sm">⚠</span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-3">
                            {exercise.description_da}
                          </p>
                          
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span className="capitalize">{exercise.type}</span>
                            {progress && (
                              <span>
                                {isCompleted 
                                  ? `${progress.score}%` 
                                  : `${progress.attempts} forsøg`}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Ingen øvelser tilgængelige for dette emne endnu.</p>
                    <p className="text-sm mt-2">Generer AI-øvelser nedenfor!</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {topics.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-xl mb-4">Ingen emner fundet for niveau {level}</p>
              <p>Kontakt support eller prøv et andet niveau.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
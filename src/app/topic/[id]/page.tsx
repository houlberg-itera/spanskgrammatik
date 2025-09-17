'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress } from '@/types/database';
import Link from 'next/link';

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = parseInt(params.id as string);
  
  const [topic, setTopic] = useState<Topic | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

      setExercises(exercisesData || []);

      // Get user progress
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', session.user.id);

        if (progressError) {
          console.error('Progress error:', progressError);
        } else {
          setUserProgress(progressData || []);
        }
      }

    } catch (error) {
      console.error('Error fetching topic data:', error);
      setError(`Kunne ikke indlæse emnet: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    } finally {
      setLoading(false);
    }
  };

  const getExerciseProgress = (exerciseId: number) => {
    return userProgress.find(p => p.exercise_id === exerciseId);
  };

  const getProgressPercentage = () => {
    if (exercises.length === 0) return 0;
    const completedExercises = exercises.filter(ex => {
      const progress = getExerciseProgress(ex.id);
      return progress && progress.completed;
    }).length;
    return Math.round((completedExercises / exercises.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser emne...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/level/${topic.level.toLowerCase()}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Tilbage til {topic.level} læringssti
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{topic.name_da}</h1>
                <p className="text-gray-600">{topic.description_da}</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{getProgressPercentage()}%</div>
                <div className="text-sm text-gray-500">Fuldført</div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Øvelser ({exercises.length})</h2>
          
          {exercises.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ingen øvelser endnu</h3>
              <p className="text-gray-600 mb-4">
                Der er ikke oprettet øvelser for dette emne endnu.
              </p>
              <Link 
                href="/admin/exercise-generator"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generer øvelser
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {exercises.map((exercise, index) => {
                const progress = getExerciseProgress(exercise.id);
                const isCompleted = progress && progress.completed;
                const score = progress?.score || 0;
                
                return (
                  <div key={exercise.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{exercise.title_da}</h3>
                          {isCompleted && (
                            <div className="flex items-center gap-1 text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">{score}%</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-3">{exercise.description_da}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="capitalize">{exercise.type}</span>
                          <span>Niveau: {exercise.level}</span>
                          {exercise.ai_generated && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                              AI-genereret
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-6">
                        <Link
                          href={`/exercise/${exercise.id}`}
                          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isCompleted
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isCompleted ? 'Gentag øvelse' : 'Start øvelse'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';
import Link from 'next/link';
import ArticleTip from '@/components/ArticleTip';
import dynamic from 'next/dynamic';

// Dynamically import SimplePath to avoid SSR issues
const SimplePath = dynamic(() => import('@/components/SimplePath'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Indlæser læringssti...</div>
    </div>
  )
});

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

      {/* Duolingo-Style Learning Path */}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Indlæser læringssti...</div>
        </div>
      }>
        <SimplePath
          level={level}
          topics={topics}
          exercises={exercises}
          userProgress={userProgress}
          onRefresh={fetchData}
        />
      </Suspense>
    </div>
  );
}
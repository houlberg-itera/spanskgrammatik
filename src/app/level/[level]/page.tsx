'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';
import Link from 'next/link';
import ArticleTip from '@/components/ArticleTip';
import AppHeader from '@/components/AppHeader';
import dynamic from 'next/dynamic';

// Dynamically import LearningPath to avoid SSR issues
const LearningPath = dynamic(() => import('@/components/LearningPath'), {
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
        if (process.env.NODE_ENV === 'development') {
          console.log('Page became visible, refreshing data...');
        }
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
      // Get user's target language
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data: userData } = await supabase
        .from('users')
        .select('target_language')
        .eq('id', currentUser.id)
        .single();

      const targetLanguage = userData?.target_language || 'es';

      // Fetch topics for this level and language
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .eq('level', level)
        .eq('target_language', targetLanguage)
        .order('order_index');

      if (topicsData) {
        setTopics(topicsData);
      }

      // Fetch exercises for this level and language
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')
        .eq('level', level)
        .eq('target_language', targetLanguage);

      if (exercisesData) {
        setExercises(exercisesData);
      }

      // Fetch user progress
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

 
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    );
  }

  // Check if no topics found for selected language
  const noTopicsForLanguage = !loading && topics.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared App Header */}
      <AppHeader showUserInfo={true} pageTitle={`Niveau ${level} - Læringssti`} />
      
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Tilbage til dashboard
          </Link>
        </div>
      </div>

      {/* No content message */}
      {noTopicsForLanguage ? (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Ingen emner tilgængelige endnu
            </h2>
            <p className="text-gray-600 mb-4">
              Der er ingen emner for niveau {level} på dit valgte sprog endnu.
            </p>
            <p className="text-sm text-gray-500">
              Kontakt en administrator for at tilføje indhold, eller skift til et andet sprog i indstillingerne.
            </p>
            <div className="mt-6 space-x-4">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tilbage til dashboard
              </Link>
              <Link
                href="/settings"
                className="inline-block px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Sprogindstillinger
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Duolingo-Style Learning Path */
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl">Indlæser læringssti...</div>
          </div>
        }>
          <LearningPath
            level={level}
            topics={topics}
            exercises={exercises}
            userProgress={userProgress}
            onRefresh={fetchData}
          />
        </Suspense>
      )}
    </div>
  );
}
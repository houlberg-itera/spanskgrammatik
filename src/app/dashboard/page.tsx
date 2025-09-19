'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Level, UserLevelProgress } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState<string | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<Record<string, any>>({});
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data when the page becomes visible (user returns from exercises)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Dashboard became visible, refreshing progress data...');
        fetchData();
      }
    };

    const handleFocus = () => {
      console.log('Dashboard focused, refreshing progress data...');
      fetchData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userData) {
      setUser(userData);
    }
  }, [router, supabase]);

  const fetchData = useCallback(async () => {
    if (!loading) setRefreshing(true);
    
    try {
      // Fetch levels
      const { data: levelsData } = await supabase
        .from('levels')
        .select('*')
        .order('order_index');

      if (levelsData) {
        setLevels(levelsData);
      }

      // Fetch user progress from user_progress table (same as level pages)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        console.log(`📊 Dashboard: Fetching progress for user ${currentUser.id}`);
        
        // Fetch user_progress data (individual exercise completions)
        const { data: userProgressData, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', currentUser.id);

        if (progressError) {
          console.error('❌ Dashboard: Error fetching user_progress:', progressError);
          setUserProgress([]);
          return;
        }

        // Fetch exercises to calculate progress correctly
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('*');

        if (exercisesError) {
          console.error('❌ Dashboard: Error fetching exercises:', exercisesError);
          setUserProgress([]);
          return;
        }

        // Calculate level progress the same way as level pages
        const levelProgressData = calculateLevelProgress(levelsData || [], exercisesData || [], userProgressData || []);
        
        console.log(`📈 Dashboard: Calculated progress for ${levelProgressData?.length || 0} levels:`, levelProgressData);
        setUserProgress(levelProgressData || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, loading]);

  // Calculate level progress the same way as the working level pages
  const calculateLevelProgress = (levels: any[], exercises: any[], userProgressData: any[]) => {
    const completedExerciseIds = new Set(
      userProgressData.filter(up => up.completed).map(up => up.exercise_id)
    );

    return levels.map(level => {
      // Get exercises for this level
      const levelExercises = exercises.filter(ex => ex.level === level.name);
      
      if (levelExercises.length === 0) {
        return {
          level: level.name,
          progress_percentage: 0,
          completed_at: null
        };
      }

      // Count total questions and completed questions for this level
      let totalQuestions = 0;
      let completedQuestions = 0;
      
      levelExercises.forEach(exercise => {
        if (exercise.content && exercise.content.questions) {
          const questionCount = exercise.content.questions.length;
          totalQuestions += questionCount;
          
          // If this exercise is completed, count all its questions as completed
          if (completedExerciseIds.has(exercise.id)) {
            completedQuestions += questionCount;
          }
        }
      });

      const progress_percentage = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;
      
      // Consider level completed if progress is 100%
      const completed_at = progress_percentage === 100 ? new Date().toISOString() : null;

      console.log(`📊 Level ${level.name}: ${completedQuestions}/${totalQuestions} questions completed (${progress_percentage}%)`);

      return {
        level: level.name,
        progress_percentage,
        completed_at
      };
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getLevelProgress = (levelName: string) => {
    return userProgress.find(p => p.level === levelName);
  };

  const isLevelUnlocked = (levelName: string, orderIndex: number) => {
    // All levels are now unlocked - users can choose their preferred level
    return true;
  };

  const requestAiAssessment = async (level: string) => {
    setAssessmentLoading(level);
    try {
      const response = await fetch('/api/assess-level', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssessmentResults(prev => ({
          ...prev,
          [level]: data
        }));
      } else {
        alert('Kunne ikke generere AI-vurdering. Prøv igen senere.');
      }
    } catch (error) {
      console.error('Error requesting AI assessment:', error);
      alert('Fejl ved AI-vurdering. Prøv igen senere.');
    } finally {
      setAssessmentLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg sm:text-xl text-gray-600">Indlæser...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Spanskgrammatik</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <span className="text-sm sm:text-base text-gray-700 hidden sm:block">
                  Hej, {user.full_name || user.email}!
                </span>
              )}
              {user && (
                <span className="text-xs text-gray-700 sm:hidden truncate max-w-20">
                  {user.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-3 py-2 sm:px-4 text-sm sm:text-base rounded-md hover:bg-red-700 transition-colors"
              >
                Log ud
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Mit Dashboard</h2>
          <p className="text-base sm:text-lg text-gray-600">
            Nuværende niveau: <span className="font-semibold text-blue-600">{user?.current_level}</span>
          </p>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {levels.map((level) => {
            const progress = getLevelProgress(level.name);
            const isUnlocked = isLevelUnlocked(level.name, level.order_index);
            const progressPercentage = progress?.progress_percentage || 0;

            return (
              <div
                key={level.id}
                className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${
                  !isUnlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
                } transition-shadow`}
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Niveau {level.name}
                  </h3>
                  {!isUnlocked && (
                    <div className="text-gray-400 text-lg sm:text-xl">
                      🔒
                    </div>
                  )}
                </div>
                
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{level.description_da}</p>
                
                {isUnlocked && (
                  <>
                    {/* Progress Bar */}
                    <div className="mb-3 sm:mb-4">
                      <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                        <span>Fremgang</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2">
                        <div
                          className="bg-blue-600 h-2 sm:h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="space-y-2">
                      <Link
                        href={`/level/${level.name.toLowerCase()}`}
                        className="w-full bg-blue-600 text-white py-3 sm:py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block text-sm sm:text-base font-medium"
                      >
                        {progressPercentage > 0 ? 'Fortsæt øvelser' : 'Start øvelser'}
                      </Link>
                      
                      {/* AI Assessment Button */}
                      {progressPercentage > 50 && (
                        <button
                          onClick={() => requestAiAssessment(level.name)}
                          disabled={assessmentLoading === level.name}
                          className="w-full bg-purple-600 text-white py-2 sm:py-2 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                        >
                          {assessmentLoading === level.name ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              <span className="hidden sm:inline">Vurderer med AI...</span>
                              <span className="sm:hidden">Vurderer...</span>
                            </span>
                          ) : (
                            <span>🤖 <span className="hidden sm:inline">AI Niveauvurdering</span><span className="sm:hidden">AI Test</span></span>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* AI Assessment Results */}
                    {assessmentResults[level.name] && (
                      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-purple-600">🤖</span>
                          <h4 className="font-medium text-purple-800 text-sm sm:text-base">AI Niveauvurdering</h4>
                          {assessmentResults[level.name].isCompleted && (
                            <span className="text-green-600 text-xs sm:text-sm">✅ Gennemført</span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-purple-700 mb-2">
                          <strong>Statistik:</strong> {assessmentResults[level.name].statistics.completionPercentage.toFixed(1)}% øvelser, {assessmentResults[level.name].statistics.averageScore.toFixed(1)}% gennemsnit
                        </div>
                        <details className="text-xs sm:text-sm">
                          <summary className="cursor-pointer text-purple-600 hover:text-purple-800">
                            Vis detaljeret vurdering
                          </summary>
                          <div className="mt-2 text-purple-700 whitespace-pre-line text-xs sm:text-sm">
                            {assessmentResults[level.name].assessment}
                          </div>
                        </details>
                      </div>
                    )}
                  </>
                )}

                {!isUnlocked && (
                  <div className="text-xs sm:text-sm text-gray-500">
                    Kompletter forrige niveau for at låse op
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Enhanced Statistics */}
        <div className="mt-8 sm:mt-12 bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Mine Statistikker</h3>
            {refreshing && (
              <div className="text-xs sm:text-sm text-blue-600 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="hidden sm:inline">Opdaterer...</span>
                <span className="sm:hidden">...</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                {userProgress.filter(p => p.completed_at).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Afsluttede niveauer</div>
              <div className="text-xs text-gray-500 mt-1">
                af {levels.length} tilgængelige
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {userProgress.length > 0 ? 
                  Math.round(userProgress.reduce((acc, p) => acc + p.progress_percentage, 0) / userProgress.length) : 0}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Gennemsnitlig fremgang</div>
              <div className="text-xs text-gray-500 mt-1">
                på tværs af alle niveauer
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                {user?.current_level || 'A1'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Nuværende niveau</div>
              <div className="text-xs text-gray-500 mt-1">
                kan vælges frit
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                {userProgress.reduce((acc, p) => acc + (p.progress_percentage > 0 ? 1 : 0), 0)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Aktive niveauer</div>
              <div className="text-xs text-gray-500 mt-1">
                med fremgang &gt; 0%
              </div>
            </div>
          </div>

          {/* Detailed Progress Breakdown */}
          {userProgress.length > 0 && (
            <div className="mt-6 sm:mt-8 border-t pt-4 sm:pt-6">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Detaljeret Fremgang</h4>
              <div className="space-y-2 sm:space-y-3">
                {userProgress.map((progress) => (
                  <div key={progress.level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        Niveau {progress.level}
                      </span>
                      {progress.completed_at && (
                        <span className="text-green-600 text-xs sm:text-sm flex-shrink-0">✓ 
                          <span className="hidden sm:inline ml-1">Afsluttet</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                      <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.progress_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700 w-8 sm:w-12 text-right">
                        {progress.progress_percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

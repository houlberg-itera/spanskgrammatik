'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Level, UserLevelProgress } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [userProgress, setUserProgress] = useState<UserLevelProgress[]>([]);
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

      // Fetch user progress
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        console.log(`📊 Dashboard: Fetching progress for user ${currentUser.id}`);
        const { data: progressData, error: progressError } = await supabase
          .from('user_level_progress')
          .select('*')
          .eq('user_id', currentUser.id);

        if (progressError) {
          console.error('❌ Dashboard: Error fetching progress:', progressError);
        } else {
          console.log(`📈 Dashboard: Retrieved progress for ${progressData?.length || 0} levels:`, progressData);
          setUserProgress(progressData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, loading]);

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
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Spanskgrammatik</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-gray-700">Hej, {user.full_name || user.email}!</span>
              )}
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                title="Opdater fremgang"
              >
                {refreshing ? '🔄 Opdaterer...' : '🔄 Opdater'}
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Log ud
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Mit Dashboard</h2>
          <p className="text-lg text-gray-600">
            Nuværende niveau: <span className="font-semibold text-blue-600">{user?.current_level}</span>
          </p>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => {
            const progress = getLevelProgress(level.name);
            const isUnlocked = isLevelUnlocked(level.name, level.order_index);
            const progressPercentage = progress?.progress_percentage || 0;

            return (
              <div
                key={level.id}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  !isUnlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
                } transition-shadow`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Niveau {level.name}
                  </h3>
                  {!isUnlocked && (
                    <div className="text-gray-400">
                      🔒
                    </div>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">{level.description_da}</p>
                
                {isUnlocked && (
                  <>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Fremgang</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="space-y-2">
                      <Link
                        href={`/level/${level.name.toLowerCase()}`}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block"
                      >
                        {progressPercentage > 0 ? 'Fortsæt øvelser' : 'Start øvelser'}
                      </Link>
                      
                      {/* AI Assessment Button */}
                      {progressPercentage > 50 && (
                        <button
                          onClick={() => requestAiAssessment(level.name)}
                          disabled={assessmentLoading === level.name}
                          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          {assessmentLoading === level.name ? (
                            'Vurderer med AI...'
                          ) : (
                            '🤖 AI Niveauvurdering'
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* AI Assessment Results */}
                    {assessmentResults[level.name] && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-purple-600">🤖</span>
                          <h4 className="font-medium text-purple-800">AI Niveauvurdering</h4>
                          {assessmentResults[level.name].isCompleted && (
                            <span className="text-green-600 text-sm">✅ Gennemført</span>
                          )}
                        </div>
                        <div className="text-sm text-purple-700 mb-2">
                          <strong>Statistik:</strong> {assessmentResults[level.name].statistics.completionPercentage.toFixed(1)}% øvelser, {assessmentResults[level.name].statistics.averageScore.toFixed(1)}% gennemsnit
                        </div>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-purple-600 hover:text-purple-800">
                            Vis detaljeret vurdering
                          </summary>
                          <div className="mt-2 text-purple-700 whitespace-pre-line">
                            {assessmentResults[level.name].assessment}
                          </div>
                        </details>
                      </div>
                    )}
                  </>
                )}

                {!isUnlocked && (
                  <div className="text-sm text-gray-500">
                    Kompletter forrige niveau for at låse op
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Special Training Modules */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📚 Specialiseret Træning</h3>
          <p className="text-gray-600 mb-6">
            Målrettede træningsmoduler for specifikke spanske grammatikudfordringer
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Future Training Modules Placeholder */}
            <div className="border border-gray-200 rounded-lg p-6 opacity-50">
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">🔄</span>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Verbum Træning</h4>
                  <p className="text-sm text-gray-600">Avanceret konjugation (kommer snart)</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Dybdegående træning af spanske verber med særligt fokus på uregelmæssige 
                mønstre og tidssystemer.
              </p>
              <div className="text-center text-gray-500 py-2">
                🚧 Under udvikling
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Mine Statistikker</h3>
            {refreshing && (
              <div className="text-sm text-blue-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Opdaterer...
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {userProgress.filter(p => p.completed_at).length}
              </div>
              <div className="text-sm text-gray-600">Afsluttede niveauer</div>
              <div className="text-xs text-gray-500 mt-1">
                af {levels.length} tilgængelige
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {userProgress.length > 0 ? 
                  Math.round(userProgress.reduce((acc, p) => acc + p.progress_percentage, 0) / userProgress.length) : 0}%
              </div>
              <div className="text-sm text-gray-600">Gennemsnitlig fremgang</div>
              <div className="text-xs text-gray-500 mt-1">
                på tværs af alle niveauer
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {user?.current_level || 'A1'}
              </div>
              <div className="text-sm text-gray-600">Nuværende niveau</div>
              <div className="text-xs text-gray-500 mt-1">
                kan vælges frit
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {userProgress.reduce((acc, p) => acc + (p.progress_percentage > 0 ? 1 : 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Aktive niveauer</div>
              <div className="text-xs text-gray-500 mt-1">
                med fremgang &gt; 0%
              </div>
            </div>
          </div>

          {/* Detailed Progress Breakdown */}
          {userProgress.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Detaljeret Fremgang</h4>
              <div className="space-y-3">
                {userProgress.map((progress) => (
                  <div key={progress.level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">Niveau {progress.level}</span>
                      {progress.completed_at && (
                        <span className="text-green-600 text-sm">✓ Afsluttet</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.progress_percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-right">
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

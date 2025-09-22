'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Level, UserLevelProgress } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState<string | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<Record<string, any>>({});
  
  // Duolingo-style gamification states
  const [userStats, setUserStats] = useState({
    totalXP: 0,
    currentStreak: 0,
    longestStreak: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    rank: 0,
    finishedTopics: 0,
    weeklyGoal: 100,
    weeklyProgress: 0
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [medals, setMedals] = useState({
    bronze: false,
    silver: false,
    gold: false,
    diamond: false
  });
  
  const router = useRouter();
  const supabase = createClient();

  // Streak calculation functions
  const calculateStreak = (userProgressData: any[]): number => {
    const recentCompletions = userProgressData
      .filter(up => up.completed && up.completed_at)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    
    if (recentCompletions.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const uniqueDays = new Set<string>();
    
    // Group completions by day
    for (const completion of recentCompletions) {
      const completionDate = new Date(completion.completed_at);
      completionDate.setHours(0, 0, 0, 0);
      const dayKey = completionDate.toISOString().split('T')[0];
      uniqueDays.add(dayKey);
    }
    
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    
    // Calculate streak from most recent day
    for (let i = 0; i < sortedDays.length; i++) {
      const dayDate = new Date(sortedDays[i]);
      const daysDiff = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateLongestStreak = (userProgressData: any[]): number => {
    const recentCompletions = userProgressData
      .filter(up => up.completed && up.completed_at)
      .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
    
    if (recentCompletions.length === 0) return 0;
    
    const uniqueDays = new Set<string>();
    
    // Group completions by day
    for (const completion of recentCompletions) {
      const completionDate = new Date(completion.completed_at);
      completionDate.setHours(0, 0, 0, 0);
      const dayKey = completionDate.toISOString().split('T')[0];
      uniqueDays.add(dayKey);
    }
    
    const sortedDays = Array.from(uniqueDays).sort();
    
    let longestStreak = 0;
    let currentLongestStreak = 1;
    
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentLongestStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentLongestStreak);
        currentLongestStreak = 1;
      }
    }
    
    return Math.max(longestStreak, currentLongestStreak);
  };

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

  // Fetch user stats for gamification
  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Get user progress from the correct table
      const { data: results, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalQuestions = results?.length || 0;
      const correctAnswers = results?.filter(r => r.score >= 70).length || 0;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const totalXP = correctAnswers * 10; // 10 XP per correct answer

      // Calculate streak from actual practice days
      const currentStreak = calculateStreak(results || []);
      const longestStreak = calculateLongestStreak(results || []);

      // Get finished topics count
      const { data: topicsData } = await supabase
        .from('topics')
        .select('*');

      const finishedTopics = Math.floor((correctAnswers / 20)); // Approximate

      // Weekly progress (placeholder)
      const weeklyProgress = Math.min(totalQuestions, 100);

      setUserStats({
        totalXP,
        currentStreak,
        longestStreak,
        questionsAnswered: totalQuestions,
        correctAnswers,
        accuracy,
        rank: 1, // Will be calculated with leaderboard
        finishedTopics,
        weeklyGoal: 100,
        weeklyProgress
      });

      // Update medals based on questions answered
      setMedals({
        bronze: totalQuestions >= 10,
        silver: totalQuestions >= 50,
        gold: totalQuestions >= 100,
        diamond: totalQuestions >= 250
      });

      // Update achievements
      const newAchievements = [];
      if (currentStreak >= 3) newAchievements.push({ name: 'Streak Master', icon: '🔥', description: '3 day streak!' });
      if (accuracy >= 90) newAchievements.push({ name: 'Precision Expert', icon: '🎯', description: '90%+ accuracy!' });
      if (totalQuestions >= 100) newAchievements.push({ name: 'Question Crusher', icon: '💪', description: '100+ questions answered!' });
      
      setAchievements(newAchievements);

    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      // Get all users with their progress
      const { data: allUserProgress, error } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          score,
          completed,
          users!inner(full_name, email)
        `)
        .eq('completed', true);

      if (error) throw error;

      // Group by user and calculate stats
      const userStatsMap = new Map();
      
      allUserProgress?.forEach(result => {
        const userId = result.user_id;
        const userData = Array.isArray(result.users) ? result.users[0] : result.users;
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            user_id: userId,
            name: userData?.full_name || userData?.email?.split('@')[0] || 'Unknown',
            email: userData?.email || '',
            totalQuestions: 0,
            correctAnswers: 0,
            accuracy: 0,
            xp: 0
          });
        }
        
        const userStats = userStatsMap.get(userId);
        userStats.totalQuestions++;
        if (result.score && result.score >= 70) {
          userStats.correctAnswers++;
          userStats.xp += 10;
        }
      });

      // Calculate accuracy and sort by XP
      const leaderboardData = Array.from(userStatsMap.values())
        .map(user => ({
          ...user,
          accuracy: user.totalQuestions > 0 ? Math.round((user.correctAnswers / user.totalQuestions) * 100) : 0
        }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10)
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));

      setLeaderboard(leaderboardData);

      // Update current user's rank
      const currentUserRank = leaderboardData.findIndex(u => u.user_id === user?.id) + 1;
      setUserStats(prev => ({
        ...prev,
        rank: currentUserRank || leaderboardData.length + 1
      }));

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchLeaderboard();
    }
  }, [user]);

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
            <div className="flex items-center space-x-2">
              <Image src="/duck.png" alt="Duck mascot" width={32} height={32} className="drop-shadow-md" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Ducklingo</h1>
              <span className="text-2xl">🇪🇸</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 bg-purple-100 px-3 py-2 rounded-md">
                <span>🏆</span>
                <span className="text-sm font-medium text-purple-800">Rang #{userStats.rank}</span>
              </div>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4 flex items-center gap-3">
            <Image src="/duck.png" alt="Duck mascot" width={40} height={40} className="drop-shadow-md" />
            Mit Dashboard 🇪🇸
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Nuværende niveau: <span className="font-semibold text-blue-600">{user?.current_level}</span>
          </p>
        </div>

        {/* Levels Grid - Moved to top as requested */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {levels.map((level) => {
            const progress = getLevelProgress(level.name);
            const isUnlocked = isLevelUnlocked(level.name, level.order_index);
            const progressPercentage = progress?.progress_percentage || 0;

            return (
              <div
                key={level.id}
                className={`bg-white rounded-lg shadow-md transition-all duration-200 ${
                  isUnlocked ? 'hover:shadow-lg cursor-pointer' : 'opacity-75'
                } border border-gray-200`}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-900">
                      {level.name}
                    </h3>
                    {progressPercentage === 100 && (
                      <span className="text-green-600 text-xl">✅</span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                    {level.description_da}
                  </p>
                  
                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between items-center mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Fremgang</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">
                        {progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {isUnlocked && (
                    <>
                      <div className="flex flex-col space-y-2">
                        <Link
                          href={`/level/${level.name.toLowerCase()}`}
                          className="w-full bg-blue-600 text-white py-2 sm:py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">🎯 Start øvelser</span>
                          <span className="sm:hidden">🎯 Start</span>
                        </Link>
                      </div>
                    
                    </>
                  )}

                  {!isUnlocked && (
                    <div className="text-xs sm:text-sm text-gray-500">
                      Kompletter forrige niveau for at låse op
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Duolingo-style Scoreboard */}
        <div className="mb-8 space-y-6">
          {/* User Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{userStats.totalXP}</div>
                    <div className="text-blue-100 text-sm">Total XP</div>
                  </div>
                  <div className="text-2xl">⭐</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{userStats.currentStreak}</div>
                    <div className="text-orange-100 text-sm">Streak</div>
                  </div>
                  <div className="text-2xl">🔥</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{userStats.questionsAnswered}</div>
                    <div className="text-green-100 text-sm">Spørgsmål besvaret</div>
                  </div>
                  <div className="text-2xl">📝</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">#{userStats.rank}</div>
                    <div className="text-purple-100 text-sm">Min placering</div>
                  </div>
                  <div className="text-2xl">🏆</div>
                </div>
              </div>
            </div>

            {/* Weekly Goal Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Ugentligt mål</h3>
                <span className="text-sm text-gray-600">{userStats.weeklyProgress}/{userStats.weeklyGoal} spørgsmål</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((userStats.weeklyProgress / userStats.weeklyGoal) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {Math.round((userStats.weeklyProgress / userStats.weeklyGoal) * 100)}% fuldført
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                🏆 Top 10 Leaderboard
              </h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((player, index) => (
                  <div
                    key={player.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.user_id === user?.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-600">{player.xp} XP</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{Math.round(player.accuracy)}% præcision</div>
                      <div className="text-xs text-gray-600">{player.totalQuestions} spørgsmål</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Medals and Achievements */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Medals */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏅 Medaljer</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`text-center p-3 rounded-lg ${medals.bronze ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <div className="text-2xl mb-1">🥉</div>
                    <div className="text-sm font-medium">Bronze</div>
                    <div className="text-xs text-gray-600">10+ spørgsmål</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${medals.silver ? 'bg-gray-200' : 'bg-gray-100'}`}>
                    <div className="text-2xl mb-1">🥈</div>
                    <div className="text-sm font-medium">Sølv</div>
                    <div className="text-xs text-gray-600">50+ spørgsmål</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${medals.gold ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                    <div className="text-2xl mb-1">🥇</div>
                    <div className="text-sm font-medium">Guld</div>
                    <div className="text-xs text-gray-600">100+ spørgsmål</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${medals.diamond ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <div className="text-2xl mb-1">💎</div>
                    <div className="text-sm font-medium">Diamant</div>
                    <div className="text-xs text-gray-600">250+ spørgsmål</div>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎖️ Præstationer</h3>
                <div className="space-y-3">
                  {achievements.length > 0 ? (
                    achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div>
                          <div className="font-medium text-green-800">{achievement.name}</div>
                          <div className="text-sm text-green-600">{achievement.description}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <div className="text-3xl mb-2">🎯</div>
                      <div className="text-sm">Fortsæt med at øve dig for at låse præstationer op!</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

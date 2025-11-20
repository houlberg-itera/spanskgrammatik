'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Leaderboard from '@/components/Leaderboard';
import AppHeader from '@/components/AppHeader';
import type { UserReward } from '@/types/rewards';
import { getMedalDisplay, calculateProgressToNextMedal, getNextMedal, MEDAL_REQUIREMENTS } from '@/lib/rewards';

// Medal emojis for display
const MEDAL_EMOJI = {
  none: '⚪',
  bronze: '🥉',
  silver: '🥈', 
  gold: '🥇',
  diamond: '💎',
  emerald: '🟢'
} as const;

type Level = {
  id: string;
  name: string;
  progress_percentage: number;
};

type User = {
  id: string;
  email: string;
  display_name?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userRewards, setUserRewards] = useState<UserReward | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const checkUser = async () => {
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
    setLoading(false);
  };

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch reward data
      const rewardResponse = await fetch('/api/rewards');
      if (rewardResponse.ok) {
        const rewardData = await rewardResponse.json();
        setUserRewards(rewardData);
      }

      // Fetch user level progress
      const levelResponse = await fetch('/api/user-levels');
      if (levelResponse.ok) {
        const levelData = await levelResponse.json();
        setLevels(levelData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ikke autoriseret</h1>
          <Link href="/auth" className="text-blue-600 hover:text-blue-800">
            Log ind for at fortsætte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Shared App Header */}
      <AppHeader showUserInfo={true} pageTitle="Mine Statistikker" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Velkommen tilbage! 👋</h2>
                <p className="text-gray-600">
                  Klar til at lære mere {user?.target_language === 'pt' ? 'portugisisk' : 'spansk'} grammatik i dag? Lad os se dine fremskridt!
                </p>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Indstillinger</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Level Progress - Moved to top per user request */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 Dine Niveauer</h2>
          <div className="grid gap-4">
            {levels.length > 0 ? (
              levels.map((level) => (
                <div key={level.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{level.name}</h3>
                      <div className="w-64 bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(level.progress_percentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {Math.round(level.progress_percentage)}% færdig
                      </p>
                    </div>
                    <Link
                      href={`/level/${level.id.toLowerCase()}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Fortsæt
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/level/a1"
                  className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6 text-center hover:bg-blue-200 transition-colors"
                >
                  <h3 className="text-xl font-bold text-blue-800">A1 - Begynder</h3>
                  <p className="text-blue-600 mt-2">Start din rejse!</p>
                </Link>
                <Link
                  href="/level/a2"
                  className="bg-green-100 border-2 border-green-300 rounded-lg p-6 text-center hover:bg-green-200 transition-colors"
                >
                  <h3 className="text-xl font-bold text-green-800">A2 - Elementær</h3>
                  <p className="text-green-600 mt-2">Byg på dit fundament</p>
                </Link>
                <Link
                  href="/level/b1"
                  className="bg-orange-100 border-2 border-orange-300 rounded-lg p-6 text-center hover:bg-orange-200 transition-colors"
                >
                  <h3 className="text-xl font-bold text-orange-800">B1 - Mellem</h3>
                  <p className="text-orange-600 mt-2">Avancerede begreber</p>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Reward Stats */}
            {userRewards && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6"> Dine Præstationer</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-4 rounded-lg text-center">
                    <div className="text-3xl mb-2">{MEDAL_EMOJI[userRewards.medal_type as keyof typeof MEDAL_EMOJI] || MEDAL_EMOJI.none}</div>
                    <div className="text-sm text-gray-600">Medal</div>
                    <div className="font-semibold capitalize">
                      {userRewards.medal_type === 'none' ? 'Ingen Medalje' : userRewards.medal_type}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{userRewards.total_xp || 0}</div>
                    <div className="text-sm text-gray-600">Total XP</div>
                    <div className="text-xs text-blue-500">💎</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{userRewards.current_streak || 0}</div>
                    <div className="text-sm text-gray-600">Streak</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(userRewards.accuracy_percentage)}%</div>
                    <div className="text-sm text-gray-600">Nøjagtighed</div>
                  </div>
                </div>
                
                {/* Achievements */}
                {userRewards.achievements && userRewards.achievements.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3"> Seneste Præstationer</h3>
                    <div className="flex flex-wrap gap-2">
                      {userRewards.achievements.slice(0, 3).map((achievement, index) => (
                        <div key={index} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                          {String(achievement)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medal Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-3">🏆</span>
                Din Medalje Status
              </h2>
              
              {user?.id && userRewards ? (
                <div className="space-y-6">
                  {/* Current Medal Display */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">
                          {getMedalDisplay(userRewards.medal_type || 'bronze').emoji}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">
                            {getMedalDisplay(userRewards.medal_type || 'bronze').name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Din nuværende medalje
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {userRewards.questions_answered || 0}
                        </div>
                        <p className="text-xs text-gray-500">Spørgsmål besvaret</p>
                      </div>
                    </div>
                  </div>

                  {/* Current Medal Requirements */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 flex items-center mb-3">
                      <span className="mr-2">📋</span>
                      {getMedalDisplay(userRewards.medal_type || 'bronze').name} Medalje Krav
                    </h4>
                    
                    {(() => {
                      const currentMedal = userRewards.medal_type || 'bronze';
                      const currentRequirements = MEDAL_REQUIREMENTS[currentMedal];
                      
                      // Handle case where currentMedal is 'none' and no requirements exist
                      if (!currentRequirements) {
                        return (
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="text-center p-4 bg-gray-100 rounded">
                              <span className="text-gray-500">Ingen medalje opnået endnu</span>
                            </div>
                            <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
                              <strong>💪 Fortsæt!</strong> Svar korrekt på spørgsmål for at opnå din første medalje.
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between items-center">
                            <span>🎯 Korrekte svar:</span>
                            <span className="font-medium">{currentRequirements.questions} spørgsmål</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>⭐ XP krævet:</span>
                            <span className="font-medium">{currentRequirements.xp} XP</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>🎯 Nøjagtighed:</span>
                            <span className="font-medium">{currentRequirements.accuracy}%</span>
                          </div>
                          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
                            <strong>✅ Du har opnået denne medalje!</strong> {userRewards.questions_answered || 0} korrekte svar, {userRewards.total_xp || 0} XP.
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Progress to Next Medal */}
                  {(() => {
                    const currentMedal = userRewards.medal_type || 'bronze';
                    const nextMedalType = getNextMedal(currentMedal);
                    
                    if (nextMedalType) {
                      // Check if requirements exist for the next medal type
                      const nextMedalRequirements = MEDAL_REQUIREMENTS[nextMedalType];
                      if (!nextMedalRequirements) {
                        return null; // Skip this section if requirements don't exist
                      }
                      
                      const nextMedalInfo = {
                        type: nextMedalType,
                        name: getMedalDisplay(nextMedalType).name,
                        questions: nextMedalRequirements.questions,
                        xp: nextMedalRequirements.xp,
                        accuracy: nextMedalRequirements.accuracy
                      };
                      
                      const currentQuestions = userRewards.questions_answered || 0;
                      const currentXP = userRewards.xp_earned || 0;
                      const currentAccuracy = userRewards.accuracy_percentage || 0;
                      
                      // Calculate progress based on the most limiting factor
                      const questionProgress = Math.min((currentQuestions / nextMedalInfo.questions) * 100, 100);
                      const xpProgress = Math.min((currentXP / nextMedalInfo.xp) * 100, 100);
                      const accuracyProgress = Math.min((currentAccuracy / nextMedalInfo.accuracy) * 100, 100);
                      const overallProgress = Math.min(questionProgress, xpProgress, accuracyProgress);
                      
                      return (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800 flex items-center">
                              <span className="mr-2">🎯</span>
                              Næste Medalje
                            </h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>{Math.floor(overallProgress)}%</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="text-3xl">{MEDAL_EMOJI[nextMedalType]}</div>
                            <div>
                              <h5 className="font-medium text-gray-800">{nextMedalInfo.name}</h5>
                              <p className="text-sm text-gray-600">
                                Kræver {nextMedalInfo.questions} spørgsmål, {nextMedalInfo.xp} XP, {nextMedalInfo.accuracy}% nøjagtighed
                              </p>
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(overallProgress, 100)}%` }}
                            />
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Spørgsmål:</span>
                              <span>{currentQuestions} / {nextMedalInfo.questions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>XP:</span>
                              <span>{currentXP} / {nextMedalInfo.xp}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Nøjagtighed:</span>
                              <span>{currentAccuracy.toFixed(1)}% / {nextMedalInfo.accuracy}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200 text-center">
                          <div className="text-4xl mb-2">👑</div>
                          <h4 className="font-bold text-emerald-800 mb-1">Maksimal Medalje Opnået!</h4>
                          <p className="text-emerald-600 text-sm">
                            Du har låst op for alle tilgængelige medaljer
                          </p>
                        </div>
                      );
                    }
                  })()}

                  {/* Medal Requirements Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: 'bronze', name: 'Bronze', questions: 50, emoji: '🥉' },
                      { type: 'silver', name: 'Sølv', questions: 200, emoji: '🥈' },
                      { type: 'gold', name: 'Guld', questions: 500, emoji: '🥇' },
                      { type: 'diamond', name: 'Diamant', questions: 1500, emoji: '💎' }
                    ].map((medal) => {
                      const achieved = (userRewards.questions_answered || 0) >= medal.questions;
                      return (
                        <div 
                          key={medal.type}
                          className={`text-center p-3 rounded-lg border-2 transition-all ${
                            achieved 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className={`text-2xl mb-1 ${achieved ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                            {medal.emoji}
                          </div>
                          <p className={`font-medium text-sm ${achieved ? 'text-green-800' : 'text-gray-600'}`}>
                            {medal.name}
                          </p>
                          <p className={`text-xs ${achieved ? 'text-green-600' : 'text-gray-500'}`}>
                            {medal.questions} spørgsmål
                          </p>
                          {achieved && (
                            <div className="text-green-500 text-xs mt-1">✅ Opnået</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg mb-2">🏆</div>
                  <p className="text-gray-500">
                    {!user ? 'Log ind for at se din medalje status' : 'Indlæser medalje data...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Rangliste</h2>
              <Leaderboard limit={10} className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

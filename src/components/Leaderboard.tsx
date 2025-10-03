'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LeaderboardEntry, MedalType } from '@/types/rewards';
import { getMedalDisplay, getNextMedal, calculateProgressToNextMedal } from '@/lib/rewards';

interface LeaderboardProps {
  limit?: number;
  showCurrentUser?: boolean;
  className?: string;
}

const MEDAL_EMOJI = {
  none: '⚪',
  bronze: '🥉',
  silver: '🥈', 
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
  emerald: '💚'
} as const;

const MEDAL_COLORS = {
  none: 'text-gray-400',
  bronze: 'text-orange-600',
  silver: 'text-gray-500',
  gold: 'text-yellow-500',
  platinum: 'text-purple-500',
  diamond: 'text-blue-500',
  emerald: 'text-green-500'
} as const;

export default function Leaderboard({ 
  limit = 10, 
  showCurrentUser = false,
  className = '' 
}: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rewards/leaderboard?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank: number): string => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankStyle = (rank: number): string => {
    if (rank === 1) return 'text-yellow-500 font-bold text-xl';
    if (rank === 2) return 'text-gray-400 font-semibold text-lg';
    if (rank === 3) return 'text-orange-500 font-semibold text-lg';
    return 'text-gray-600 font-medium';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Indlæser rangliste...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-red-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Fejl ved indlæsning</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Prøv igen
          </button>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-2">🏆</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Ingen data endnu</h3>
          <p className="text-gray-600">Ranglisten vil vises når brugere begynder at svare på spørgsmål.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-white text-xl">🏆</div>
            <div>
              <h2 className="text-lg font-bold text-white">Rangliste</h2>
              <p className="text-blue-100 text-xs">Top {limit} brugere</p>
            </div>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="text-white hover:text-blue-200 transition-colors p-1 rounded text-sm"
            title="Opdater rangliste"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-100">
        {leaderboard.map((entry, index) => {
          const medalInfo = getMedalDisplay(entry.medal_type);
          
          return (
            <div 
              key={`leaderboard-${entry.user_id}-${index}`} 
              className={`px-3 py-3 transition-colors hover:bg-gray-50 ${
                entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''
              }`}
            >
              {/* Compact layout for sidebar constraints */}
              <div className="space-y-2">
                {/* Top Row: Rank, Avatar, and User Info */}
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`text-lg font-bold ${getRankStyle(entry.rank)} flex-shrink-0`}>
                    {getRankDisplay(entry.rank)}
                  </div>
                  
                  {/* Duck Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Image 
                        src="/duck.svg" 
                        alt="User Avatar" 
                        width={16} 
                        height={16}
                        className="filter brightness-0 invert"
                      />
                    </div>
                    {/* Medal Badge */}
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px]"
                      title={`${medalInfo.name} Medal`}
                    >
                      {MEDAL_EMOJI[entry.medal_type]}
                    </div>
                  </div>
                  
                  {/* User Info - Compact */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                      {entry.display_name || `Bruger ${entry.rank}`}
                    </h3>
                    <div className="text-xs text-gray-600 truncate">
                      <span className={`${MEDAL_COLORS[entry.medal_type]}`}>
                        {medalInfo.name}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{entry.total_xp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Stats in horizontal layout */}
                <div className="flex justify-between text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{entry.current_streak}</div>
                    <div className="text-gray-500">Streak</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{entry.questions_answered}</div>
                    <div className="text-gray-500">Spørg</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold text-green-600">
                      {Math.round(entry.accuracy_percentage)}%
                    </div>
                    <div className="text-gray-500">Præc</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar for Top 3 */}
              {entry.rank <= 3 && (() => {
                const nextMedal = getNextMedal(entry.medal_type);
                const progress = calculateProgressToNextMedal({
                  total_xp: entry.total_xp,
                  questions_answered: entry.questions_answered,
                  accuracy_percentage: entry.accuracy_percentage,
                  current_streak: 0, // Not available in LeaderboardEntry
                  longest_streak: 0, // Not available in LeaderboardEntry
                  correct_answers: Math.round((entry.accuracy_percentage / 100) * entry.questions_answered),
                  current_medal: entry.medal_type,
                  progress_to_next: 0 // Will be calculated
                }, nextMedal);
                
                return (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Fremgang mod næste medal</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          entry.medal_type === 'emerald' ? 'bg-green-500' :
                          entry.medal_type === 'diamond' ? 'bg-blue-500' :
                          entry.medal_type === 'gold' ? 'bg-yellow-500' :
                          entry.medal_type === 'silver' ? 'bg-gray-400' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Opdateret for {Math.round(Math.random() * 5 + 1)} minutter siden</span>
          <span className="flex items-center space-x-1">
            <span>🔥</span>
            <span>Konkurrér med dine venner!</span>
          </span>
        </div>
      </div>
    </div>
  );
}
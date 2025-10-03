import { createClient } from '@/lib/supabase/server';
import { UserStats, MedalType } from '@/types/rewards';
import { 
  calculateXP, 
  getCurrentMedal, 
  getNextMedal, 
  calculateProgressToNextMedal,
  generateAchievements 
} from '@/lib/rewards';

/**
 * Calculate streak from completion dates
 * @param progressData Array of user_progress records with created_at timestamps
 * @returns Object with current_streak and longest_streak values
 */
function calculateStreak(progressData: any[]): { current_streak: number; longest_streak: number } {
  if (!progressData || progressData.length === 0) {
    return { current_streak: 0, longest_streak: 0 };
  }

  // Get unique practice dates (ignore time, just dates)
  const practiceDates = progressData
    .map(record => new Date(record.created_at))
    .map(date => date.toDateString()) // Convert to date string to ignore time
    .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // Sort chronologically

  if (practiceDates.length === 0) {
    return { current_streak: 0, longest_streak: 0 };
  }

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  // Calculate streaks by checking consecutive days
  for (let i = 1; i < practiceDates.length; i++) {
    const currentDate = new Date(practiceDates[i]);
    const previousDate = new Date(practiceDates[i - 1]);
    
    // Check if dates are consecutive (1 day apart)
    const diffTime = currentDate.getTime() - previousDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      // Consecutive day - extend streak
      tempStreak++;
    } else {
      // Not consecutive - record longest streak and reset
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  // Final check for longest streak
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (from most recent practice date)
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString(); // 24 hours ago
  const mostRecentPractice = practiceDates[practiceDates.length - 1];
  
  // Current streak is active if practiced today or yesterday
  if (mostRecentPractice === today || mostRecentPractice === yesterday) {
    // Count backwards from most recent to find current streak length
    currentStreak = 1;
    for (let i = practiceDates.length - 2; i >= 0; i--) {
      const currentDate = new Date(practiceDates[i + 1]);
      const previousDate = new Date(practiceDates[i]);
      
      const diffTime = currentDate.getTime() - previousDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    // No recent practice - current streak is 0
    currentStreak = 0;
  }

  return { current_streak: currentStreak, longest_streak: longestStreak };
}

/**
 * Calculate user reward statistics from user_progress data
 * @param userId User ID to calculate stats for
 * @returns UserStats object with calculated values
 */
export async function calculateUserStats(userId: string): Promise<UserStats | null> {
  try {
    const supabase = await createClient();
    
    // Fetch user progress data
    const { data: progressData, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user progress:', error);
      return null;
    }

    if (!progressData || progressData.length === 0) {
      // Return default stats for new users - calculate medal properly!
      const defaultStats: UserStats = {
        total_xp: 0,
        current_streak: 0,
        longest_streak: 0,
        questions_answered: 0,
        correct_answers: 0,
        accuracy_percentage: 0,
        current_medal: 'none', // Placeholder - will be calculated
        next_medal: undefined,
        progress_to_next: 0,
      };

      // Calculate medal correctly for users with 0 stats
      const currentMedal = getCurrentMedal(defaultStats);
      const nextMedal = getNextMedal(currentMedal);
      const progressToNext = calculateProgressToNextMedal(defaultStats, nextMedal);

      defaultStats.current_medal = currentMedal;
      defaultStats.next_medal = nextMedal;
      defaultStats.progress_to_next = progressToNext;

      return defaultStats;
    }

    // Calculate stats from progress data
    let totalCorrectAnswers = 0;
    let totalQuestions = 0;
    let perfectScores = 0;

    for (const record of progressData) {
      const score = record.score || 0;
      const questionResults = record.question_results;
      
      if (Array.isArray(questionResults)) {
        // New format: array of question results
        totalQuestions += questionResults.length;
        totalCorrectAnswers += questionResults.filter(q => q.correct).length;
      } else if (questionResults && typeof questionResults === 'object') {
        // Legacy format: single question result
        totalQuestions += 1;
        if (questionResults.correct) {
          totalCorrectAnswers += 1;
        }
      } else if (score >= 70) {
        // Fallback: use score to estimate correct answers
        totalCorrectAnswers += 1;
        totalQuestions += 1;
      }

      // Count perfect scores (100%)
      if (score === 100) {
        perfectScores += 1;
      }
    }

    // Calculate derived statistics
    console.log('🔧 XP Debug - totalCorrectAnswers:', totalCorrectAnswers);
    console.log('🔧 XP Debug - perfectScores:', perfectScores);
    const total_xp = calculateXP(totalCorrectAnswers, perfectScores);
    console.log('🔧 XP Debug - calculated total_xp:', total_xp);
    const accuracy_percentage = totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0;

    // Calculate streak from completion dates
    const { current_streak, longest_streak } = calculateStreak(progressData);

    const userStats: UserStats = {
      total_xp,
      current_streak,
      longest_streak,
      questions_answered: totalQuestions,
      correct_answers: totalCorrectAnswers,
      accuracy_percentage,
      current_medal: 'none', // Will be calculated next
      next_medal: undefined,
      progress_to_next: 0,
    };

    // Calculate medal and progress
    const currentMedal = getCurrentMedal(userStats);
    const nextMedal = getNextMedal(currentMedal);
    const progressToNext = calculateProgressToNextMedal(userStats, nextMedal);

    userStats.current_medal = currentMedal;
    userStats.next_medal = nextMedal;
    userStats.progress_to_next = progressToNext;

    return userStats;
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return null;
  }
}

/**
 * Calculate leaderboard data for multiple users
 * @param limit Number of top users to return
 * @returns Array of leaderboard entries
 */
export async function calculateLeaderboard(limit: number = 10) {
  try {
    const supabase = await createClient();
    
    // Get all users with progress data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(100); // Limit to avoid performance issues

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return [];
    }

    if (!users || users.length === 0) {
      return [];
    }

    // Calculate stats for each user
    const userStatsPromises = users.map(async (user) => {
      console.log(`🎯 PROCESSING USER: ${user.email} (ID: ${user.id})`);
      const stats = await calculateUserStats(user.id);
      console.log(`🎯 STATS FOR ${user.email}:`, stats);
      if (!stats) {
        console.log(`🎯 NO STATS FOR ${user.email}, returning null`);
        return null;
      }

      const leaderboardEntry = {
        user_id: user.id,
        email: user.email || 'Anonymous',
        display_name: user.full_name || user.email || 'Anonymous',
        medal_type: stats.current_medal,
        total_xp: stats.total_xp,
        current_streak: stats.current_streak,
        longest_streak: stats.longest_streak,
        questions_answered: stats.questions_answered,
        accuracy_percentage: stats.accuracy_percentage,
        achievements_count: generateAchievements(stats).length,
        rank: 0, // Will be set after sorting
      };
      
      console.log(`🎯 LEADERBOARD ENTRY FOR ${user.email}:`, leaderboardEntry);
      return leaderboardEntry;
    });

    const userStatsResults = await Promise.all(userStatsPromises);
    const validUserStats = userStatsResults.filter((stats): stats is NonNullable<typeof stats> => stats !== null);

    // Sort by total XP (descending) and assign ranks
    validUserStats.sort((a, b) => b.total_xp - a.total_xp);
    validUserStats.forEach((stats, index) => {
      stats.rank = index + 1;
    });

    // Return top N users
    return validUserStats.slice(0, limit);
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return [];
  }
}
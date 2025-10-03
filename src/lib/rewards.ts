import { MedalType, MedalRequirements, UserStats, Achievement } from '@/types/rewards';

// Medal requirements configuration - FIXED: Lowered requirements to use correct answers
export const MEDAL_REQUIREMENTS: MedalRequirements = {
  bronze: {
    xp: 50,
    questions: 10,
    accuracy: 60,
  },
  silver: {
    xp: 250,
    questions: 50,
    accuracy: 70,
  },
  gold: {
    xp: 750,
    questions: 100,
    accuracy: 80,
  },
  diamond: {
    xp: 2500,
    questions: 250,
    accuracy: 85,
  },
  emerald: {
    xp: 5000,
    questions: 500,
    accuracy: 90,
  },
};

// Medal order for progression
const MEDAL_ORDER: MedalType[] = ['bronze', 'silver', 'gold', 'diamond', 'emerald'];

/**
 * Calculate XP from user progress
 * @param correctAnswers Number of correct answers
 * @param perfectScores Number of perfect exercise scores
 * @returns Total XP earned
 */
export function calculateXP(correctAnswers: number, perfectScores: number = 0): number {
  const baseXP = correctAnswers * 10; // 10 XP per correct answer
  const bonusXP = perfectScores * 50; // 50 bonus XP for perfect exercises
  return baseXP + bonusXP;
}

/**
 * Determine user's current medal based on their stats
 * @param userStats User's performance statistics
 * @returns Current medal type
 */
export function getCurrentMedal(userStats: UserStats): MedalType {
  const { total_xp, correct_answers, accuracy_percentage } = userStats;
  
  console.log('🏅 MEDAL DEBUG - Input stats:', { total_xp, correct_answers, accuracy_percentage });
  
  // Check from highest to lowest medal - FIXED: Use correct_answers instead of questions_answered
  for (let i = MEDAL_ORDER.length - 1; i >= 0; i--) {
    const medal = MEDAL_ORDER[i];
    const requirements = MEDAL_REQUIREMENTS[medal];
    
    const meetsXP = total_xp >= requirements.xp;
    const meetsQuestions = correct_answers >= requirements.questions;
    const meetsAccuracy = accuracy_percentage >= requirements.accuracy;
    
    console.log(`🏅 MEDAL DEBUG - Checking ${medal}: XP(${total_xp}>=${requirements.xp})=${meetsXP}, Questions(${correct_answers}>=${requirements.questions})=${meetsQuestions}, Accuracy(${accuracy_percentage}>=${requirements.accuracy})=${meetsAccuracy}`);
    
    if (meetsXP && meetsQuestions && meetsAccuracy) {
      console.log(`🏅 MEDAL DEBUG - QUALIFIED for ${medal}!`);
      return medal;
    }
  }
  
  console.log('🏅 MEDAL DEBUG - NO MEDAL QUALIFIED, returning "none"');
  // FIXED: Return 'none' instead of 'bronze' for users who don't meet requirements
  return 'none' as MedalType;
}

/**
 * Get the next medal user can achieve
 * @param currentMedal Current medal type
 * @returns Next medal type or undefined if at highest level
 */
export function getNextMedal(currentMedal: MedalType): MedalType | undefined {
  const currentIndex = MEDAL_ORDER.indexOf(currentMedal);
  if (currentIndex === -1 || currentIndex === MEDAL_ORDER.length - 1) {
    return undefined;
  }
  return MEDAL_ORDER[currentIndex + 1];
}

/**
 * Calculate progress percentage to next medal
 * @param userStats User's current statistics
 * @param nextMedal Target medal
 * @returns Progress percentage (0-100)
 */
export function calculateProgressToNextMedal(
  userStats: UserStats, 
  nextMedal?: MedalType
): number {
  if (!nextMedal) return 100; // Already at highest level
  
  const requirements = MEDAL_REQUIREMENTS[nextMedal];
  const { total_xp, correct_answers, accuracy_percentage } = userStats;
  
  // Calculate progress for each requirement - FIXED: Use correct_answers instead of questions_answered
  const xpProgress = Math.min((total_xp / requirements.xp) * 100, 100);
  const questionsProgress = Math.min((correct_answers / requirements.questions) * 100, 100);
  const accuracyProgress = Math.min((accuracy_percentage / requirements.accuracy) * 100, 100);
  
  // Return the minimum progress (bottleneck requirement)
  return Math.floor(Math.min(xpProgress, questionsProgress, accuracyProgress));
}

/**
 * Generate achievements based on user performance
 * @param userStats User's current statistics
 * @returns Array of earned achievements
 */
export function generateAchievements(userStats: UserStats): Achievement[] {
  const achievements: Achievement[] = [];
  const now = new Date().toISOString();
  
  // Streak achievements
  if (userStats.current_streak >= 7) {
    achievements.push({
      id: 'week_streak',
      name: 'Week Warrior',
      description: 'Maintained a 7-day streak',
      icon: '🔥',
      earned_at: now,
      type: 'streak',
    });
  }
  
  if (userStats.current_streak >= 30) {
    achievements.push({
      id: 'month_streak',
      name: 'Month Master',
      description: 'Maintained a 30-day streak',
      icon: '🏆',
      earned_at: now,
      type: 'streak',
    });
  }
  
  // Accuracy achievements
  if (userStats.accuracy_percentage >= 95 && userStats.questions_answered >= 100) {
    achievements.push({
      id: 'perfectionist',
      name: 'Perfectionist',
      description: '95%+ accuracy with 100+ questions',
      icon: '💎',
      earned_at: now,
      type: 'accuracy',
    });
  }
  
  // Question milestones
  if (userStats.questions_answered >= 1000) {
    achievements.push({
      id: 'thousand_questions',
      name: 'Question Master',
      description: 'Answered 1000+ questions',
      icon: '🧠',
      earned_at: now,
      type: 'questions',
    });
  }
  
  return achievements;
}

/**
 * Get medal display properties
 * @param medal Medal type
 * @returns Display properties for the medal
 */
export function getMedalDisplay(medal: MedalType) {
  const displays = {
    none: {
      emoji: '⚪',
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300',
      name: 'Ingen Medalje',
    },
    bronze: {
      emoji: '🥉',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      name: 'Bronze',
    },
    silver: {
      emoji: '🥈',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      name: 'Silver',
    },
    gold: {
      emoji: '🥇',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      name: 'Gold',
    },
    diamond: {
      emoji: '💎',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      name: 'Diamond',
    },
    emerald: {
      emoji: '💚',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      name: 'Emerald',
    },
  };
  
  // Return the medal display or default to none if medal is invalid
  return displays[medal] || displays.none;
}
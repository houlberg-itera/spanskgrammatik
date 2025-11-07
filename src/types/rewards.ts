// Duolingo-style reward system types

export type MedalType = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'emerald';

export interface UserReward {
  id: string;
  user_id: string;
  medal_type: MedalType;
  xp_earned: number;
  streak_count: number;
  questions_answered: number;
  accuracy_percentage: number;
  achievements: string[];
  created_at: string;
  updated_at: string;
  // Additional properties returned by /api/rewards endpoint
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  correct_answers: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  type: 'streak' | 'accuracy' | 'questions' | 'perfect_score' | 'level_master';
}

export interface LeaderboardEntry {
  user_id: string;
  email: string;
  display_name?: string;
  medal_type: MedalType;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  questions_answered: number;
  accuracy_percentage: number;
  achievements_count: number;
  rank: number;
}

export interface MedalRequirements {
  bronze: {
    xp: number;
    questions: number;
    accuracy: number;
  };
  silver: {
    xp: number;
    questions: number;
    accuracy: number;
  };
  gold: {
    xp: number;
    questions: number;
    accuracy: number;
  };
  diamond: {
    xp: number;
    questions: number;
    accuracy: number;
  };
  emerald: {
    xp: number;
    questions: number;
    accuracy: number;
  };
}

export interface UserStats {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  questions_answered: number;
  correct_answers: number;
  accuracy_percentage: number;
  current_medal: MedalType;
  next_medal?: MedalType;
  progress_to_next: number;
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateUserStats } from '@/lib/api/rewards-calculator';
import { generateAchievements } from '@/lib/rewards';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate user stats using application-layer logic instead of database function
    const userStats = await calculateUserStats(user.id);
    
    if (!userStats) {
      console.error('Failed to calculate user stats for user:', user.id);
      return NextResponse.json({ error: 'Failed to calculate rewards' }, { status: 500 });
    }

    // Generate achievements based on calculated stats
    const achievements = generateAchievements(userStats);

    // Return rewards data in the expected format (flat structure for dashboard)
    return NextResponse.json({
      success: true,
      userId: user.id,
      medal_type: userStats.current_medal,
      total_xp: userStats.total_xp,
      current_streak: userStats.current_streak,
      longest_streak: userStats.longest_streak,
      questions_answered: userStats.questions_answered,
      correct_answers: userStats.correct_answers,
      accuracy_percentage: userStats.accuracy_percentage,
      achievements: achievements,
      stats: userStats
    });

  } catch (error) {
    console.error('Unexpected error in rewards API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateLeaderboard } from '@/lib/api/rewards-calculator';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Calculate leaderboard using application-layer logic instead of database function
    const leaderboard = await calculateLeaderboard(limit);

    // Transform the data to match the expected response format (using snake_case to match component)
    const formattedLeaderboard = leaderboard.map((entry) => ({
      rank: entry.rank,
      user_email: entry.email,
      display_name: entry.display_name,
      medal_type: entry.medal_type,
      total_xp: entry.total_xp,
      current_streak: entry.current_streak,
      longest_streak: entry.longest_streak,
      questions_answered: entry.questions_answered,
      accuracy_percentage: entry.accuracy_percentage,
      achievements_count: entry.achievements_count,
      streak_count: entry.current_streak // Add streak_count for display
    }));

    return NextResponse.json({
      success: true,
      leaderboard: formattedLeaderboard,
      totalEntries: formattedLeaderboard.length
    });

  } catch (error) {
    console.error('Unexpected error in leaderboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
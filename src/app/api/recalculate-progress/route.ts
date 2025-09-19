import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log(`🔄 Manual recalculation triggered for user: ${user.id}`);

    // Get all user's completed exercises
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        exercise_id,
        completed,
        exercises (
          id,
          level
        )
      `)
      .eq('user_id', user.id)
      .eq('completed', true);

    if (progressError) {
      return NextResponse.json({ error: 'Failed to fetch user progress', details: progressError }, { status: 500 });
    }

    console.log(`📊 Found ${userProgress?.length || 0} completed exercises`);

    // Group by level and calculate progress
    const levelStats: Record<string, { completed: number; total: number; percentage: number }> = {};
    
    for (const progress of userProgress || []) {
      const exerciseData = Array.isArray(progress.exercises) ? progress.exercises[0] : progress.exercises;
      const level = exerciseData?.level;
      if (level) {
        if (!levelStats[level]) {
          levelStats[level] = { completed: 0, total: 0, percentage: 0 };
        }
        levelStats[level].completed++;
      }
    }

    // Get total exercises per level and calculate percentages
    for (const level of Object.keys(levelStats)) {
      const { data: allExercises, error: totalError } = await supabase
        .from('exercises')
        .select('id')
        .eq('level', level);
      
      if (!totalError && allExercises) {
        levelStats[level].total = allExercises.length;
        levelStats[level].percentage = Math.round((levelStats[level].completed / levelStats[level].total) * 100);
      }
    }

    console.log('📈 Calculated level progress:', levelStats);

    // Update user_level_progress table manually
    const updates = [];
    for (const [level, stats] of Object.entries(levelStats)) {
      console.log(`🔄 Updating ${level}: ${stats.percentage}%`);
      
      const { error: upsertError } = await supabase
        .from('user_level_progress')
        .upsert({
          user_id: user.id,
          level: level,
          progress_percentage: stats.percentage,
          completed_at: stats.percentage >= 100 ? new Date().toISOString() : null
        }, {
          onConflict: 'user_id,level'
        });

      if (upsertError) {
        console.error(`❌ Error updating ${level}:`, upsertError);
        updates.push({ level, status: 'error', error: upsertError.message });
      } else {
        console.log(`✅ Successfully updated ${level}: ${stats.percentage}%`);
        updates.push({ level, status: 'success', percentage: stats.percentage });
      }
    }

    // Verify the results
    const { data: finalResults, error: verifyError } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', user.id);

    if (verifyError) {
      console.error('❌ Error verifying results:', verifyError);
    } else {
      console.log('📊 Final user_level_progress state:', finalResults);
    }

    return NextResponse.json({
      success: true,
      message: 'Progress recalculated successfully',
      calculatedStats: levelStats,
      updates: updates,
      finalResults: finalResults
    });

  } catch (error) {
    console.error('❌ Manual recalculation failed:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
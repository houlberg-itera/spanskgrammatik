import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Get user progress for review
    const { data: levelProgress } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        levelProgress: levelProgress || []
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    let requestData = {};
    
    if (body) {
      try {
        requestData = JSON.parse(body);
      } catch (e) {
        // If it's not JSON, treat it as a fix request
      }
    }

    const { exerciseId, score, fixProgress } = requestData as any;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // If fixProgress is true, manually recalculate all level progress
    if (fixProgress) {

      // Get all user exercise progress
      const { data: exerciseProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      // Get all exercises grouped by level
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('id, level')
        .in('level', ['A1', 'A2', 'B1']);

      if (!exerciseProgress || !allExercises) {
        throw new Error('Could not fetch progress or exercises data');
      }

      // Calculate progress for each level
      const levels = ['A1', 'A2', 'B1'];
      const progressUpdates = [];

      for (const level of levels) {
        // Get exercises for this level
        const levelExercises = allExercises.filter(ex => ex.level === level);
        const totalExercises = levelExercises.length;

        // Get completed exercises for this level
        const completedExercises = exerciseProgress.filter(p => 
          p.completed && levelExercises.some(ex => ex.id === p.exercise_id)
        );
        const completedCount = completedExercises.length;

        // Calculate progress percentage
        const progressPercentage = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

        // Check if user_level_progress entry exists
        const { data: existingLevelProgress } = await supabase
          .from('user_level_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('level', level)
          .single();

        if (existingLevelProgress) {
          // Update existing
          const { error: updateError } = await supabase
            .from('user_level_progress')
            .update({
              progress_percentage: progressPercentage,
              completed_at: progressPercentage >= 100 ? new Date().toISOString() : null
            })
            .eq('user_id', user.id)
            .eq('level', level);

          if (updateError) {
            throw new Error(`Failed to update ${level} progress`);
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('user_level_progress')
            .insert({
              user_id: user.id,
              level: level,
              progress_percentage: progressPercentage,
              started_at: new Date().toISOString(),
              completed_at: progressPercentage >= 100 ? new Date().toISOString() : null
            });

          if (insertError) {
            console.error(`Error inserting ${level} progress:`, insertError);
          }
        }

        progressUpdates.push({
          level,
          totalExercises,
          completedCount,
          progressPercentage
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Progress successfully recalculated and updated',
        progressUpdates
      });
    }

    // Original functionality - test RPC function
    if (!exerciseId || score === undefined) {
      return NextResponse.json({ 
        error: 'Missing exerciseId or score. Send { "fixProgress": true } to fix progress instead.' 
      }, { status: 400 });
    }

    // Test the RPC function
    const { data, error } = await supabase
      .rpc('update_user_progress', {
        exercise_id_param: exerciseId,
        score_param: score
      });

    if (error) {
      return NextResponse.json({ 
        error: 'RPC function failed',
        details: error.message 
      }, { status: 500 });
    }

    // Check the updated progress
    const { data: updatedLevelProgress } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
      rpcResult: data,
      updatedLevelProgress
    });

  } catch (error) {
    console.error('Error in test-progress POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

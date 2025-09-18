import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID required' }, { status: 400 });
    }

    // Get exercises for this topic
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, title')
      .eq('topic_id', parseInt(topicId))
      .order('id');

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError);
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
    }

    // Get user progress for these exercises (method used by level page)
    const exerciseIds = exercises?.map(ex => ex.id) || [];
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('exercise_id', exerciseIds);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return NextResponse.json({ error: 'Failed to fetch user progress' }, { status: 500 });
    }

    // Get completed progress using topic page method
    const { data: completedProgress, error: completedError } = await supabase
      .from('user_progress')
      .select('exercise_id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('exercise_id', exerciseIds);

    if (completedError) {
      console.error('Error fetching completed progress:', completedError);
      return NextResponse.json({ error: 'Failed to fetch completed progress' }, { status: 500 });
    }

    // Calculate completed count using level page logic
    const completedExerciseIds = userProgress?.filter(up => up.completed).map(up => up.exercise_id) || [];
    const levelPageCompleted = completedExerciseIds.length;

    // Calculate completed count using topic page logic
    const topicPageCompleted = completedProgress?.length || 0;

    const debugData = {
      topicId: parseInt(topicId),
      totalExercises: exercises?.length || 0,
      exerciseIds,
      userProgressCount: userProgress?.length || 0,
      levelPageMethod: {
        completedCount: levelPageCompleted,
        completedExerciseIds,
        calculation: 'userProgress.filter(up => up.completed).length'
      },
      topicPageMethod: {
        completedCount: topicPageCompleted,
        completedExerciseIds: completedProgress?.map(cp => cp.exercise_id) || [],
        calculation: 'supabase.from(user_progress).eq(completed, true).length'
      },
      rawData: {
        userProgress: userProgress?.map(up => ({
          exercise_id: up.exercise_id,
          completed: up.completed,
          score: up.score
        })) || [],
        completedProgress: completedProgress || []
      },
      mismatch: levelPageCompleted !== topicPageCompleted
    };

    return NextResponse.json(debugData);
  } catch (error) {
    console.error('Debug progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { exerciseId, score, userId } = await request.json();
    
    console.log('=== MANUAL PROGRESS SAVE TEST ===');
    console.log('Input:', { exerciseId, score, userId });
    
    const supabase = await createClient();
    
    // Validate inputs
    if (!exerciseId || typeof score !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: exerciseId and score'
      }, { status: 400 });
    }

    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required',
          authError: authError?.message,
          tip: 'Please register and login first using the auth test dashboard'
        }, { status: 401 });
      }
      currentUserId = user.id;
    }

    console.log('Using user ID:', currentUserId);

    // First, verify the exercise exists
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, topic_id, level, title_da')
      .eq('id', exerciseId)
      .single();

    if (exerciseError || !exercise) {
      return NextResponse.json({
        success: false,
        error: 'Exercise not found',
        exerciseError: exerciseError?.message,
        exerciseId
      }, { status: 404 });
    }

    console.log('Exercise found:', exercise);

    // Try to call the RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_progress', {
      exercise_id_param: exerciseId,
      score_param: score
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update progress',
        rpcError: {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint
        },
        exercise,
        userId: currentUserId
      }, { status: 500 });
    }

    console.log('RPC Success:', rpcData);

    // Verify the progress was saved
    const { data: savedProgress, error: verifyError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('exercise_id', exerciseId)
      .single();

    if (verifyError) {
      console.warn('Could not verify saved progress:', verifyError);
    }

    console.log('Saved progress verification:', savedProgress);

    return NextResponse.json({
      success: true,
      message: 'Progress saved successfully',
      data: {
        rpcResult: rpcData,
        exercise,
        savedProgress,
        userId: currentUserId
      }
    });

  } catch (error) {
    console.error('Manual progress save test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Get all progress for debugging
    const { data: allProgress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        *,
        exercises (id, title_da, level, topic_id),
        topics (name_da, level)
      `)
      .order('completed_at', { ascending: false });

    // Get user count
    const { count: userCount, error: userCountError } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact' });

    return NextResponse.json({
      currentUser: {
        authenticated: !!user,
        userId: user?.id,
        email: user?.email,
        error: userError?.message
      },
      allProgress: {
        count: allProgress?.length || 0,
        data: allProgress,
        error: progressError?.message
      },
      userCount: {
        total: userCount || 0,
        error: userCountError?.message
      },
      instructions: {
        message: 'Use POST with { exerciseId, score } to test progress saving',
        authRequired: 'You must be logged in to save progress',
        testUser: 'Create test user via /auth-test.html dashboard'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Progress GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check current authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Check if there are any users in the system
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, current_level, created_at')
      .limit(10);
    
    // Check exercises
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, title_da, level, ai_generated')
      .limit(10);
    
    // Check any existing progress
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .limit(5);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      currentSession: {
        authenticated: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          lastSignIn: user.last_sign_in_at
        } : null,
        authError: authError?.message
      },
      systemUsers: {
        count: usersData?.length || 0,
        users: usersData || [],
        error: usersError?.message
      },
      exercises: {
        count: exercisesData?.length || 0,
        list: exercisesData || [],
        error: exercisesError?.message
      },
      progress: {
        count: progressData?.length || 0,
        entries: progressData || [],
        error: progressError?.message
      },
      nextSteps: user ? [
        'User is authenticated - can test progress saving',
        'Use POST /api/test-progress with exerciseId and score'
      ] : [
        'No authenticated user session',
        'Visit /auth to register/login',
        'Or test authentication APIs'
      ]
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Status check failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

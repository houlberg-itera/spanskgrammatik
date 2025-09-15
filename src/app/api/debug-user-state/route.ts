import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({
        authenticated: false,
        error: 'Authentication error',
        details: authError.message
      });
    }

    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json({
        authenticated: false,
        error: 'No authenticated user'
      });
    }

    console.log(`👤 User found: ${user.id} (${user.email})`);

    // Check user progress count
    const { data: progressCount, error: progressError } = await supabase
      .from('user_progress')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);

    if (progressError) {
      console.error('❌ Progress count error:', progressError);
    }

    // Check completed exercises
    const { data: completedCount, error: completedError } = await supabase
      .from('user_progress')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('completed', true);

    if (completedError) {
      console.error('❌ Completed count error:', completedError);
    }

    // Check level progress
    const { data: levelProgress, error: levelError } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', user.id);

    if (levelError) {
      console.error('❌ Level progress error:', levelError);
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      progress: {
        total_exercises: progressCount?.length || 0,
        completed_exercises: completedCount?.length || 0,
        level_progress: levelProgress || []
      }
    });

  } catch (error) {
    console.error('❌ Debug user state error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
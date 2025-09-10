import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const authStatus: any = {
      timestamp: new Date().toISOString(),
      authentication: {
        hasUser: !!user,
        userId: user?.id || null,
        email: user?.email || null,
        authError: authError?.message || null,
        status: authError ? 'FAILED' : user ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED'
      },
      environmentCheck: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };

    // If user is authenticated, test database access
    if (user) {
      try {
        // Test user_progress query
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .limit(5);

        authStatus.databaseAccess = {
          progressQuery: {
            success: !progressError,
            error: progressError?.message,
            count: progressData?.length || 0
          }
        };

        // Test RPC function access
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_progress', {
          exercise_id_param: 1, // Test with exercise ID 1
          score_param: 75
        });

        authStatus.databaseAccess.rpcTest = {
          success: !rpcError,
          error: rpcError?.message,
          errorCode: rpcError?.code
        };

      } catch (dbError) {
        authStatus.databaseAccess = {
          error: (dbError as Error).message
        };
      }
    }

    return NextResponse.json(authStatus);

  } catch (error) {
    return NextResponse.json({
      error: 'Auth test failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, email, password } = await request.json();
    const supabase = await createClient();

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      return NextResponse.json({
        success: !error,
        error: error?.message,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email
        } : null
      });
    }

    if (action === 'register') {
      // Use the signup API endpoint
      const signupResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName: 'Test User' })
      });

      const result = await signupResponse.json();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      error: 'Auth action failed',
      message: (error as Error).message
    }, { status: 500 });
  }
}

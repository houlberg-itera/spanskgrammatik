import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { exerciseId, score } = await request.json();
    
    console.log(`🧪 Testing exercise completion: exerciseId=${exerciseId}, score=${score}`);

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
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.error('❌ No user found');
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    console.log(`👤 User ID: ${user.id}`);

    // Try to save exercise progress using RPC function
    console.log(`🔄 Calling RPC function update_user_progress`);
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('update_user_progress', {
        exercise_id_param: exerciseId,
        score_param: score
      });

    if (rpcError) {
      console.error('❌ RPC error:', rpcError);
      return NextResponse.json({ 
        error: 'RPC function failed', 
        details: rpcError.message,
        code: rpcError.code 
      }, { status: 500 });
    }

    console.log(`✅ RPC function succeeded:`, rpcResult);

    // Check if progress was actually saved
    const { data: progressCheck, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .single();

    if (checkError) {
      console.error('❌ Progress check error:', checkError);
      return NextResponse.json({ 
        error: 'Failed to verify progress', 
        details: checkError.message 
      }, { status: 500 });
    }

    console.log(`✅ Progress verification:`, progressCheck);

    return NextResponse.json({ 
      success: true, 
      rpcResult,
      savedProgress: progressCheck,
      message: 'Exercise completion test successful'
    });

  } catch (error) {
    console.error('❌ Test exercise completion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
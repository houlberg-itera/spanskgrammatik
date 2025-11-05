import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, ''),
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      tests: {}
    };

    // Test 1: Check basic connectivity
    try {
      const { data, error } = await supabase.from('levels').select('count').limit(1);
      debugInfo.tests.basicConnectivity = {
        success: !error,
        error: error?.message,
        data: data
      };
    } catch (err) {
      debugInfo.tests.basicConnectivity = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 2: Check if exercises table exists and has data
    try {
      const { data, error } = await supabase.from('exercises').select('id').limit(1);
      debugInfo.tests.exercisesTable = {
        success: !error,
        error: error?.message,
        hasData: data && data.length > 0
      };
    } catch (err) {
      debugInfo.tests.exercisesTable = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 3: Check RPC function exists
    try {
      // Try calling the function with dummy data (this might fail due to auth, but we'll see different errors)
      const { data, error } = await supabase.rpc('update_user_progress', {
        exercise_id_param: 1,
        score_param: 80
      });
      
      debugInfo.tests.rpcFunction = {
        success: !error || (error && !error.message.includes('function') && !error.message.includes('does not exist')),
        error: error?.message,
        errorCode: error?.code,
        functionExists: !error || !error.message.includes('does not exist')
      };
    } catch (err) {
      debugInfo.tests.rpcFunction = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 4: Check authentication status
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      debugInfo.tests.authentication = {
        success: !error,
        error: error?.message,
        hasUser: !!user,
        userId: user?.id
      };
    } catch (err) {
      debugInfo.tests.authentication = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 5: Check if user_progress table exists
    try {
      const { data, error } = await supabase.from('user_progress').select('id').limit(1);
      debugInfo.tests.userProgressTable = {
        success: !error,
        error: error?.message,
        hasData: data && data.length > 0
      };
    } catch (err) {
      debugInfo.tests.userProgressTable = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 6: Check if user_level_progress table exists
    try {
      const { data, error } = await supabase.from('user_level_progress').select('id').limit(1);
      debugInfo.tests.userLevelProgressTable = {
        success: !error,
        error: error?.message,
        hasData: data && data.length > 0
      };
    } catch (err) {
      debugInfo.tests.userLevelProgressTable = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 7: Check AI configurations table
    try {
      const { data, error } = await supabase.from('ai_configurations').select('*').order('created_at', { ascending: false });
      debugInfo.tests.aiConfigurationsTable = {
        success: !error,
        error: error?.message,
        totalConfigs: data?.length || 0,
        activeConfigs: data?.filter(c => c.is_active) || [],
        allConfigs: data || []
      };
    } catch (err) {
      debugInfo.tests.aiConfigurationsTable = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    return NextResponse.json(debugInfo);

  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testExerciseId, testScore } = await request.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      input: { testExerciseId, testScore },
      tests: {}
    };

    // Test RPC function with provided parameters
    try {
      const { data, error } = await supabase.rpc('update_user_progress', {
        exercise_id_param: testExerciseId || 1,
        score_param: testScore || 80
      });
      
      debugInfo.tests.rpcFunctionCall = {
        success: !error,
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        data: data
      };
    } catch (err) {
      debugInfo.tests.rpcFunctionCall = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test: Exercise 370 content structure
    try {
      const { data: exercise370, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', 370)
        .single();
      
      debugInfo.tests.exercise370 = {
        success: !error,
        error: error?.message,
        exercise: exercise370,
        contentType: typeof exercise370?.content,
        isContentArray: Array.isArray(exercise370?.content),
        contentKeys: exercise370?.content ? Object.keys(exercise370.content) : null,
        questionsExist: !!exercise370?.content?.questions,
        questionsLength: exercise370?.content?.questions?.length || 0,
        rawContent: exercise370?.content
      };
    } catch (err) {
      debugInfo.tests.exercise370 = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    return NextResponse.json(debugInfo);

  } catch (error) {
    return NextResponse.json({
      error: 'RPC test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

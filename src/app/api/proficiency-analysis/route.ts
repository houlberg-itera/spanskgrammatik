import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeProficiency, generateAdaptiveExerciseRecommendations } from '@/lib/proficiency-assessment';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;
    const includeRecommendations = searchParams.get('recommendations') === 'true';

    // Perform proficiency analysis
    const analysis = await analyzeProficiency(userId);
    
    let recommendations = null;
    if (includeRecommendations) {
      recommendations = await generateAdaptiveExerciseRecommendations(userId);
    }

    // Get additional user context
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: recentProgress } = await supabase
      .from('user_progress')
      .select(`
        *,
        exercises!inner(
          title_da,
          type,
          topics!inner(name_da, level)
        )
      `)
      .eq('user_id', userId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      analysis,
      recommendations,
      userProfile,
      recentProgress: recentProgress?.map(p => ({
        exerciseTitle: (p.exercises as any)?.title_da || 'Unknown',
        score: p.score,
        completedAt: p.completed_at,
        topicName: (p.exercises as any)?.topics?.name_da || 'Unknown',
        level: (p.exercises as any)?.topics?.level || 'A1'
      })) || []
    });

  } catch (error) {
    console.error('Proficiency analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze proficiency',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication  
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (action === 'generate_adaptive_exercises') {
      // Generate exercise recommendations and optionally create them
      const recommendations = await generateAdaptiveExerciseRecommendations(userId);
      
      return NextResponse.json({
        success: true,
        recommendations,
        message: 'Adaptive exercise recommendations generated'
      });
    }

    if (action === 'update_level') {
      const { newLevel } = body;
      
      // Update user's level based on proficiency analysis
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ current_level: newLevel })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `User level updated to ${newLevel}`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Proficiency action error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform proficiency action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

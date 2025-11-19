import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/conversation/sessions
 * Create a new conversation practice session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario_id } = body;
    
    if (!scenario_id) {
      return NextResponse.json(
        { error: 'scenario_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get first dialogue
    const { data: firstDialogue } = await supabase
      .from('conversation_dialogues')
      .select('id')
      .eq('scenario_id', scenario_id)
      .order('sequence_order', { ascending: true })
      .limit(1)
      .single();
    
    // Create session
    const { data: session, error } = await supabase
      .from('user_conversation_sessions')
      .insert({
        user_id: user.id,
        scenario_id,
        current_dialogue_id: firstDialogue?.id || null,
        status: 'in_progress'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error in POST /api/conversation/sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversation/sessions
 * Get user's conversation sessions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    let query = supabase
      .from('user_conversation_sessions')
      .select(`
        *,
        conversation_scenarios (
          id,
          title_da,
          title,
          target_language,
          level
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error in GET /api/conversation/sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

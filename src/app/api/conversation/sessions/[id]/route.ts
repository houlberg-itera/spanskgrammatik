import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/conversation/sessions/[id]
 * Get a specific session with responses
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('user_conversation_sessions')
      .select(`
        *,
        conversation_scenarios (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Fetch responses
    const { data: responses } = await supabase
      .from('user_conversation_responses')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });
    
    return NextResponse.json({
      session,
      responses: responses || []
    });
  } catch (error) {
    console.error('Error in GET /api/conversation/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversation/sessions/[id]
 * Update session (progress, completion)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { current_dialogue_id, status, score, pronunciation_score, fluency_score } = body;
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const updates: any = {};
    
    if (current_dialogue_id !== undefined) {
      updates.current_dialogue_id = current_dialogue_id;
    }
    
    if (status) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }
    
    if (score !== undefined) updates.score = score;
    if (pronunciation_score !== undefined) updates.pronunciation_score = pronunciation_score;
    if (fluency_score !== undefined) updates.fluency_score = fluency_score;
    
    const { data: session, error } = await supabase
      .from('user_conversation_sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error in PATCH /api/conversation/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

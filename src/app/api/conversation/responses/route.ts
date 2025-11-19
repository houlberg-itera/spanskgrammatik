import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/conversation/responses
 * Save user's response to a dialogue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      session_id,
      dialogue_id,
      audio_url,
      transcribed_text,
      pronunciation_score,
      accuracy_score,
      feedback_da,
      feedback
    } = body;
    
    if (!session_id || !dialogue_id) {
      return NextResponse.json(
        { error: 'session_id and dialogue_id are required' },
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
    
    // Verify session belongs to user
    const { data: session } = await supabase
      .from('user_conversation_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Save response
    const { data: response, error } = await supabase
      .from('user_conversation_responses')
      .insert({
        session_id,
        dialogue_id,
        audio_url,
        transcribed_text,
        transcribed_at: transcribed_text ? new Date().toISOString() : null,
        pronunciation_score,
        accuracy_score,
        feedback_da,
        feedback
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving response:', error);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in POST /api/conversation/responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

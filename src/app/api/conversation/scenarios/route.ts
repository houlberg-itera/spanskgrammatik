import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/conversation/scenarios
 * Fetch available conversation scenarios
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language') || 'es';
    const level = searchParams.get('level');
    
    const supabase = await createClient();
    
    let query = supabase
      .from('conversation_scenarios')
      .select('*')
      .eq('target_language', language)
      .eq('is_active', true)
      .order('difficulty_score', { ascending: true });
    
    if (level) {
      query = query.eq('level', level);
    }
    
    const { data: scenarios, error } = await query;
    
    if (error) {
      console.error('Error fetching scenarios:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scenarios' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Error in GET /api/conversation/scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

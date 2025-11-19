import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/conversation/scenarios/[id]
 * Fetch a specific scenario with all its dialogues
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Fetch scenario
    const { data: scenario, error: scenarioError } = await supabase
      .from('conversation_scenarios')
      .select('*')
      .eq('id', id)
      .single();
    
    if (scenarioError || !scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Fetch dialogues
    const { data: dialogues, error: dialoguesError } = await supabase
      .from('conversation_dialogues')
      .select('*')
      .eq('scenario_id', id)
      .order('sequence_order', { ascending: true });
    
    if (dialoguesError) {
      console.error('Error fetching dialogues:', dialoguesError);
      return NextResponse.json(
        { error: 'Failed to fetch dialogues' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      scenario,
      dialogues: dialogues || []
    });
  } catch (error) {
    console.error('Error in GET /api/conversation/scenarios/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

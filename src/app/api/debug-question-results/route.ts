import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get recent user_progress entries with question_results
    const { data: entries, error } = await supabase
      .from('user_progress')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Recent user_progress entries with question_results data',
      data: entries,
      analysis: {
        totalEntries: entries?.length || 0,
        entriesWithQuestionResults: entries?.filter(entry => entry.question_results && Object.keys(entry.question_results).length > 0).length || 0,
        entriesWithEmptyResults: entries?.filter(entry => !entry.question_results || Object.keys(entry.question_results).length === 0).length || 0
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get all exercises
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, title_da, level, topic_id, ai_generated')
      .order('id');

    // Get all topics  
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name_da, level')
      .order('id');

    // Get all levels
    const { data: levels, error: levelsError } = await supabase
      .from('levels')
      .select('name, description_da, order_index')
      .order('order_index');

    return NextResponse.json({
      success: true,
      data: {
        exercises: {
          data: exercises,
          error: exercisesError?.message,
          count: exercises?.length || 0
        },
        topics: {
          data: topics,
          error: topicsError?.message,
          count: topics?.length || 0
        },
        levels: {
          data: levels,
          error: levelsError?.message,
          count: levels?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch database content',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    console.log('🔍 DEBUG: Checking exercises table...');

    // Get exercises count
    const { count: exerciseCount, error: countError } = await supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
    }

    // Get first few exercises
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, title_da, topic_id, level, type')
      .limit(5);

    if (exercisesError) {
      console.error('Exercises fetch error:', exercisesError);
    }

    // Get topics count
    const { count: topicCount, error: topicCountError } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true });

    if (topicCountError) {
      console.error('Topic count error:', topicCountError);
    }

    // Get first few topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name_da, level')
      .limit(5);

    if (topicsError) {
      console.error('Topics fetch error:', topicsError);
    }

    return NextResponse.json({
      success: true,
      debug: {
        exerciseCount,
        exerciseCountError: countError?.message,
        sampleExercises: exercises,
        exercisesError: exercisesError?.message,
        topicCount,
        topicCountError: topicCountError?.message,
        sampleTopics: topics,
        topicsError: topicsError?.message
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Debug check failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
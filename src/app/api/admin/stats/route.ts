import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    console.log('Admin Stats API: Fetching database statistics');

    // Get all topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*');

    if (topicsError) {
      console.error('Admin Stats API Topics Error:', topicsError);
      return NextResponse.json({ error: topicsError.message }, { status: 500 });
    }

    // Get all exercises
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('topic_id, level');

    if (exercisesError) {
      console.error('Admin Stats API Exercises Error:', exercisesError);
      return NextResponse.json({ error: exercisesError.message }, { status: 500 });
    }

    // Group topics by level
    const topicsByLevel = topics?.reduce((acc: any, topic: any) => {
      if (!acc[topic.level]) acc[topic.level] = [];
      acc[topic.level].push(topic);
      return acc;
    }, {}) || {};

    // Count exercises per level
    const exercisesByLevel = exercises?.reduce((acc: any, exercise: any) => {
      if (!acc[exercise.level]) acc[exercise.level] = 0;
      acc[exercise.level]++;
      return acc;
    }, {}) || {};

    console.log('Admin Stats API: Topics by level:', Object.keys(topicsByLevel).map(level => `${level}: ${topicsByLevel[level].length}`));
    console.log('Admin Stats API: Exercises by level:', Object.keys(exercisesByLevel).map(level => `${level}: ${exercisesByLevel[level]}`));

    return NextResponse.json({ 
      topicsByLevel,
      exercisesByLevel,
      totalTopics: topics?.length || 0,
      totalExercises: exercises?.length || 0
    });
    
  } catch (error) {
    console.error('Admin Stats API Exception:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}

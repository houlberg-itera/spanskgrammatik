import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());

export async function GET() {
  try {
    // Simple admin check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    console.log('Admin Stats API: Fetching database statistics');

    // Get all topics with regular client (no admin bypass needed)
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*');

    if (topicsError) {
      console.error('Admin Stats API Topics Error:', topicsError);
      return NextResponse.json({ error: topicsError.message }, { status: 500 });
    }

    // Get all exercises with regular client
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
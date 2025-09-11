import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    const supabase = createAdminClient();
    
    console.log('Admin Topics API: Fetching topics for level:', level);

    const query = supabase
      .from('topics')
      .select(`
        id,
        name_da,
        description_da,
        level,
        exercises(id)
      `);

    if (level) {
      query.eq('level', level);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin Topics API Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Admin Topics API: Found topics:', data?.length || 0);

    const topicsWithCounts = data?.map(topic => ({
      ...topic,
      exercise_count: topic.exercises?.length || 0
    })) || [];

    return NextResponse.json({ topics: topicsWithCounts });
    
  } catch (error) {
    console.error('Admin Topics API Exception:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

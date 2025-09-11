import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

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
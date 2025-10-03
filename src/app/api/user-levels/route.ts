import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user level progress
    const { data: levelProgress, error } = await supabase
      .from('user_level_progress')
      .select('level, progress_percentage')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching level progress:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Transform into expected format
    const levels = levelProgress?.map(level => ({
      id: level.level,
      name: level.level.toUpperCase(),
      progress_percentage: level.progress_percentage || 0
    })) || [];

    return NextResponse.json(levels);
  } catch (error) {
    console.error('Error in user-levels API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find all vocabulary exercises
    const { data: vocabularyExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('*')
      .eq('type', 'vocabulary')
      .eq('ai_generated', true);

    if (fetchError) {
      console.error('Error fetching exercises:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch exercises', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!vocabularyExercises || vocabularyExercises.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vocabulary exercises found',
        deleted: 0
      });
    }

    // Delete ALL vocabulary exercises
    const idsToDelete = vocabularyExercises.map(e => e.id);
    const { error: deleteError } = await supabase
      .from('exercises')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting exercises:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete exercises', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${vocabularyExercises.length} vocabulary exercises`,
      deleted: vocabularyExercises.length,
      deletedIds: idsToDelete,
      details: vocabularyExercises.map(e => ({
        id: e.id,
        title_da: e.title_da,
        topic_id: e.topic_id,
        level: e.level
      }))
    });

  } catch (error) {
    console.error('Error cleaning up vocabulary exercises:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { SpanishLevel } from '@/types/database';

// GET /api/admin/topics/[id] - Get topic by ID with detailed information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAdminClient();
    const topicId = parseInt(params.id, 10);

    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      );
    }

    // Get topic with exercise count
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select(`
        *,
        exercises:exercises(count)
      `)
      .eq('id', topicId)
      .single();

    if (topicError) {
      console.error('Error fetching topic:', topicError);
      if (topicError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch topic' },
        { status: 500 }
      );
    }

    // Format response with exercise count
    const topicWithCount = {
      ...topic,
      exercise_count: topic.exercises?.[0]?.count || 0
    };

    // Remove the exercises array since we've extracted the count
    delete topicWithCount.exercises;

    return NextResponse.json({
      success: true,
      topic: topicWithCount
    });

  } catch (error) {
    console.error('Unexpected error fetching topic:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/topics/[id] - Update topic
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAdminClient();
    const topicId = parseInt(params.id, 10);

    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      level, 
      name_da, 
      name_es, 
      description_da, 
      description_es, 
      order_index 
    } = body;

    // Validate required fields
    if (!level || !name_da || !name_es) {
      return NextResponse.json(
        { error: 'Level, Danish name, and Spanish name are required' },
        { status: 400 }
      );
    }

    // Validate Spanish level
    const validLevels: SpanishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (!validLevels.includes(level as SpanishLevel)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if topic exists
    const { data: existingTopic, error: existsError } = await supabase
      .from('topics')
      .select('id')
      .eq('id', topicId)
      .single();

    if (existsError || !existingTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Check for duplicate names (excluding current topic)
    const { data: duplicates, error: duplicateError } = await supabase
      .from('topics')
      .select('id, name_da, name_es')
      .neq('id', topicId)
      .or(`name_da.eq.${name_da},name_es.eq.${name_es}`);

    if (duplicateError) {
      console.error('Error checking for duplicates:', duplicateError);
      return NextResponse.json(
        { error: 'Failed to validate topic names' },
        { status: 500 }
      );
    }

    if (duplicates && duplicates.length > 0) {
      const duplicateNames = duplicates.map(d => 
        d.name_da === name_da ? `Danish: "${d.name_da}"` : `Spanish: "${d.name_es}"`
      ).join(', ');
      return NextResponse.json(
        { error: `Topic names must be unique. Duplicate found: ${duplicateNames}` },
        { status: 409 }
      );
    }

    // Update topic
    const updateData: any = {
      level: level as SpanishLevel,
      name_da,
      name_es,
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (description_da !== undefined) updateData.description_da = description_da;
    if (description_es !== undefined) updateData.description_es = description_es;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data: updatedTopic, error: updateError } = await supabase
      .from('topics')
      .update(updateData)
      .eq('id', topicId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating topic:', updateError);
      return NextResponse.json(
        { error: 'Failed to update topic' },
        { status: 500 }
      );
    }

    console.log(`✅ Topic updated successfully:`, {
      id: updatedTopic.id,
      level: updatedTopic.level,
      name_da: updatedTopic.name_da,
      name_es: updatedTopic.name_es
    });

    return NextResponse.json({
      success: true,
      message: 'Topic updated successfully',
      topic: updatedTopic
    });

  } catch (error) {
    console.error('Unexpected error updating topic:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/topics/[id] - Delete topic
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAdminClient();
    const topicId = parseInt(params.id, 10);

    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      );
    }

    // Check if topic exists and get its information
    const { data: existingTopic, error: existsError } = await supabase
      .from('topics')
      .select('id, name_da, name_es, level')
      .eq('id', topicId)
      .single();

    if (existsError || !existingTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Check if topic has exercises
    const { data: exercises, error: exerciseError } = await supabase
      .from('exercises')
      .select('id')
      .eq('topic_id', topicId)
      .limit(1);

    if (exerciseError) {
      console.error('Error checking for exercises:', exerciseError);
      return NextResponse.json(
        { error: 'Failed to check topic dependencies' },
        { status: 500 }
      );
    }

    if (exercises && exercises.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete topic with existing exercises. Please delete all exercises first.',
          hasExercises: true,
          topicInfo: {
            id: existingTopic.id,
            name_da: existingTopic.name_da,
            name_es: existingTopic.name_es,
            level: existingTopic.level
          }
        },
        { status: 409 }
      );
    }

    // Delete the topic
    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId);

    if (deleteError) {
      console.error('Error deleting topic:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete topic' },
        { status: 500 }
      );
    }

    console.log(`✅ Topic deleted successfully:`, {
      id: existingTopic.id,
      level: existingTopic.level,
      name_da: existingTopic.name_da,
      name_es: existingTopic.name_es
    });

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully',
      deletedTopic: existingTopic
    });

  } catch (error) {
    console.error('Unexpected error deleting topic:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
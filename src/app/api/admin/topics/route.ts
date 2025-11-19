import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { SpanishLevel } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const language = searchParams.get('language') || searchParams.get('target_language');

    const supabase = createAdminClient();
    
    const query = supabase
      .from('topics')
      .select(`
        id,
        level,
        name_da,
        name,
        description_da,
        description,
        target_language,
        order_index,
        created_at,
        exercises(id, target_language)
      `)
      .order('order_index', { ascending: true });

    if (level) {
      query.eq('level', level);
    }

    // Filter by language if specified (not 'all')
    if (language && language !== 'all') {
      query.eq('target_language', language);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin Topics API Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const topicsWithCounts = data?.map(topic => {
      // If a specific language requested (not 'all'), count only that language's exercises
      const exerciseCount = (language && language !== 'all')
        ? (topic.exercises?.filter((ex: any) => ex.target_language === language).length || 0)
        : (topic.exercises?.length || 0);
      return { ...topic, exercise_count: exerciseCount };
    }) || [];

    return NextResponse.json({ 
      success: true,
      topics: topicsWithCounts,
      count: topicsWithCounts.length
    });
    
  } catch (error) {
    console.error('Admin Topics API Exception:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const body = await request.json();
    const { 
      level, 
      name_da, 
      name, 
      description_da, 
      description, 
      target_language,
      order_index 
    } = body;

    // Validate required fields
    if (!level || !name_da || !name || !target_language || order_index === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: level, name_da, name, target_language, order_index' 
      }, { status: 400 });
    }

    // Validate level
    const validLevels: SpanishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (!validLevels.includes(level)) {
      return NextResponse.json({ 
        error: 'Invalid level. Must be one of: ' + validLevels.join(', ') 
      }, { status: 400 });
    }

    // Validate target_language
    if (!['es', 'pt'].includes(target_language)) {
      return NextResponse.json({ 
        error: 'Invalid target_language. Must be es or pt' 
      }, { status: 400 });
    }

    // Check for duplicate names within the same level and language
    const { data: existingTopics, error: checkError } = await supabase
      .from('topics')
      .select('id, name_da, name')
      .eq('level', level)
      .eq('target_language', target_language)
      .or(`name_da.eq.${name_da.trim()},name.eq.${name.trim()}`);

    if (checkError) {
      console.error('Topic duplicate check error:', checkError);
      return NextResponse.json({ 
        error: 'Failed to check for duplicates' 
      }, { status: 500 });
    }

    if (existingTopics && existingTopics.length > 0) {
      return NextResponse.json({ 
        error: 'Topic with this name already exists in this level and language' 
      }, { status: 409 });
    }

    // Insert new topic
    const { data: newTopic, error: insertError } = await supabase
      .from('topics')
      .insert({
        level,
        name_da: name_da.trim(),
        name: name.trim(),
        description_da: description_da?.trim() || null,
        description: description?.trim() || null,
        target_language,
        order_index: parseInt(order_index)
      })
      .select()
      .single();

    if (insertError) {
      console.error('Topic creation error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create topic: ' + insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      topic: newTopic,
      message: 'Topic created successfully'
    });

  } catch (error) {
    console.error('Topic creation unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

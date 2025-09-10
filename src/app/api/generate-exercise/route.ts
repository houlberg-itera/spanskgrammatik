import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExercise } from '@/lib/openai';
import { SpanishLevel } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, exerciseType } = body;

    if (!topicId || !exerciseType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch topic details
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Generate exercise content using OpenAI
    const exerciseContent = await generateExercise({
      level: topic.level as SpanishLevel,
      topic: topic.name_da,
      topicDescription: topic.description_da || '',
      exerciseType,
      questionCount: 5,
    });

    // Save the generated exercise to database
    const { data: newExercise, error: insertError } = await supabase
      .from('exercises')
      .insert({
        topic_id: topicId,
        level: topic.level,
        type: exerciseType,
        title_da: `AI-genereret øvelse: ${topic.name_da}`,
        title_es: `Ejercicio generado por IA: ${topic.name_es}`,
        description_da: `Automatisk genereret øvelse om ${topic.name_da}`,
        description_es: `Ejercicio generado automáticamente sobre ${topic.name_es}`,
        content: exerciseContent,
        ai_generated: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting exercise:', insertError);
      return NextResponse.json({ error: 'Failed to save exercise' }, { status: 500 });
    }

    return NextResponse.json({ exercise: newExercise });
  } catch (error) {
    console.error('Error generating exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

interface VocabularyExercise {
  id: string;
  question_da: string;
  question_es?: string;
  correct_answer: string;
  options?: string[];
  explanation_da?: string;
  explanation_es?: string;
}

interface SaveRequest {
  topic: string;
  topicNameDa?: string; // Proper Danish name for display
  level: 'A1' | 'A2' | 'B1';
  exercises: VocabularyExercise[];
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation';
  targetLanguage?: 'es' | 'pt';
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();
    const { topic, topicNameDa, level, exercises, exerciseType, targetLanguage = 'es' } = body;

    if (!topic || !level || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, level, and exercises array' },
        { status: 400 }
      );
    }

    // Use proper Danish name if provided, otherwise use topic key
    const displayNameDa = topicNameDa || topic;

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

    // Check if topic exists, if not create it
    let topicRecord;
    const { data: existingTopic } = await supabase
      .from('topics')
      .select('id')
      .eq('name_da', displayNameDa)
      .eq('level', level)
      .eq('target_language', targetLanguage)
      .single();

    if (existingTopic) {
      topicRecord = existingTopic;
    } else {
      // Create new topic
      const { data: newTopic, error: topicError } = await supabase
        .from('topics')
        .insert({
          name_da: displayNameDa,
          name: topic, // Use the key as the target language name
          level,
          target_language: targetLanguage,
          description_da: `AI-genererede ordforrådsøvelser for ${displayNameDa}`,
          description: `Ejercicios de vocabulario generados por IA para ${topic}`,
          order_index: 999 // Place at end
        })
        .select('id')
        .single();

      if (topicError) {
        console.error('Error creating topic:', topicError);
        return NextResponse.json(
          { error: 'Failed to create topic', details: topicError.message },
          { status: 500 }
        );
      }

      topicRecord = newTopic;
    }

    // Build the exercise content with all questions
    const exerciseContent: any = {
      questions: exercises.map((exercise, index) => ({
        id: index + 1,
        question_da: exercise.question_da,
        question: exercise.question_es || exercise.question_da, // Target language question
        correct_answer: exercise.correct_answer,
        options: exerciseType === 'multiple_choice' ? exercise.options : undefined,
        explanation_da: exercise.explanation_da,
        explanation: exercise.explanation_es,
        type: exerciseType
      })),
      instructions_da: `Ordforrådsøvelse for ${displayNameDa}`,
      instructions: `Ejercicio de vocabulario para ${topic}`
    };

    // Create a single exercise with all questions
    const exerciseInsert = {
      topic_id: topicRecord.id,
      level,
      target_language: targetLanguage,
      type: 'vocabulary' as const,
      title_da: `Ordforråd: ${displayNameDa}`,
      title: `Vocabulario: ${topic}`,
      description_da: `AI-genereret ordforrådsøvelse for ${displayNameDa}`,
      description: `Ejercicio de vocabulario generado por IA para ${topic}`,
      content: exerciseContent,
      ai_generated: true
    };

    const { data: savedExercises, error: exerciseError } = await supabase
      .from('exercises')
      .insert([exerciseInsert])
      .select('id');

    if (exerciseError) {
      console.error('Error saving exercises:', exerciseError);
      return NextResponse.json(
        { error: 'Failed to save exercises', details: exerciseError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved vocabulary exercise with ${exercises.length} questions`,
      topicId: topicRecord.id,
      exerciseId: savedExercises?.[0]?.id,
      questionCount: exercises.length
    });

  } catch (error) {
    console.error('Error in save-vocabulary-exercise:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
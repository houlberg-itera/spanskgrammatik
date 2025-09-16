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
  level: 'A1' | 'A2' | 'B1';
  exercises: VocabularyExercise[];
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation';
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveRequest = await request.json();
    const { topic, level, exercises, exerciseType } = body;

    if (!topic || !level || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, level, and exercises array' },
        { status: 400 }
      );
    }

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
      .eq('name_da', topic)
      .eq('level', level)
      .single();

    if (existingTopic) {
      topicRecord = existingTopic;
    } else {
      // Create new topic
      const { data: newTopic, error: topicError } = await supabase
        .from('topics')
        .insert({
          name_da: topic,
          name_es: topic,
          level,
          description_da: `AI-genererede ordforrådsøvelser for ${topic}`,
          description_es: `Ejercicios de vocabulario generados por IA para ${topic}`,
          order_index: 999 // Place at end
        })
        .select('id')
        .single();

      if (topicError) {
        console.error('Error creating topic:', topicError);
        return NextResponse.json(
          { error: 'Failed to create topic' },
          { status: 500 }
        );
      }

      topicRecord = newTopic;
    }

    // Save exercises to database
    const exerciseInserts = exercises.map((exercise, index) => {
      const content: any = {
        question_da: exercise.question_da,
        question_es: exercise.question_es || exercise.question_da,
        correct_answer: exercise.correct_answer
      };

      // Add options for multiple choice
      if (exerciseType === 'multiple_choice' && exercise.options) {
        content.options = exercise.options;
      }

      // Add explanation if provided
      if (exercise.explanation_da) {
        content.explanation_da = exercise.explanation_da;
      }
      if (exercise.explanation_es) {
        content.explanation_es = exercise.explanation_es;
      }

      return {
        topic_id: topicRecord.id,
        level,
        type: 'vocabulary', // Using the exercise_type enum
        title_da: `Ordforråd: ${topic} - Øvelse ${index + 1}`,
        title_es: `Vocabulario: ${topic} - Ejercicio ${index + 1}`,
        description_da: `AI-genereret ordforrådsøvelse for ${topic}`,
        description_es: `Ejercicio de vocabulario generado por IA para ${topic}`,
        content,
        ai_generated: true
      };
    });

    const { data: savedExercises, error: exerciseError } = await supabase
      .from('exercises')
      .insert(exerciseInserts)
      .select('id');

    if (exerciseError) {
      console.error('Error saving exercises:', exerciseError);
      return NextResponse.json(
        { error: 'Failed to save exercises' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${exercises.length} vocabulary exercises`,
      topicId: topicRecord.id,
      exerciseIds: savedExercises?.map(e => e.id) || []
    });

  } catch (error) {
    console.error('Error in save-vocabulary-exercise:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
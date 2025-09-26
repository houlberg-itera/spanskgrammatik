import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const topicId = url.searchParams.get('topicId') || '5';
    const exerciseId = url.searchParams.get('exerciseId') || '967';
    
    const supabase = await createClient();
    
    // Get all exercises for this topic
    const { data: allExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('topic_id', parseInt(topicId));
    
    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError);
      return NextResponse.json({ error: exercisesError.message }, { status: 500 });
    }

    // Look for the specific exercise
    const targetExercise = allExercises?.find(ex => ex.id === parseInt(exerciseId));
    
    return NextResponse.json({
      debug: {
        topicId: parseInt(topicId),
        searchingForExerciseId: parseInt(exerciseId),
        totalExercisesInTopic: allExercises?.length || 0,
        allExerciseIds: allExercises?.map(ex => ex.id) || [],
        targetExerciseFound: !!targetExercise,
        targetExercise: targetExercise ? {
          id: targetExercise.id,
          question: targetExercise.content?.question_da || 'No question',
          hasOptions: !!targetExercise.content?.options,
          correctAnswer: targetExercise.content?.correct_answer
        } : null
      }
    });
    
  } catch (error) {
    console.error('Debug retry mode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
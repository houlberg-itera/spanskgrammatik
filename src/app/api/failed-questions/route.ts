import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');
    const userId = searchParams.get('userId');

    if (!exerciseId || !userId) {
      return NextResponse.json({ error: 'Exercise ID and User ID are required' }, { status: 400 });
    }

    // Get the exercise to access its questions
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('content')
      .eq('id', exerciseId)
      .single();

    if (exerciseError || !exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Parse questions from exercise content
    let questions = [];
    if (exercise.content?.questions) {
      questions = exercise.content.questions;
    } else if (Array.isArray(exercise.content)) {
      questions = exercise.content;
    }

    if (questions.length === 0) {
      return NextResponse.json({ failedQuestions: [], allQuestions: [] });
    }

    // Get user's previous attempts for this exercise from user_exercise_results
    const { data: previousAttempts, error: attemptsError } = await supabase
      .from('user_exercise_results')
      .select('*')
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('Error fetching previous attempts:', attemptsError);
      return NextResponse.json({ failedQuestions: [], allQuestions: questions });
    }

    // Identify failed questions from previous attempts
    const failedQuestionIds = new Set();
    
    if (previousAttempts && previousAttempts.length > 0) {
      // Get the most recent attempt
      const lastAttempt = previousAttempts[0];
      
      // If the attempt has detailed question results, use those
      if (lastAttempt.question_results) {
        Object.entries(lastAttempt.question_results).forEach(([questionId, result]: [string, any]) => {
          if (!result.correct) {
            failedQuestionIds.add(questionId);
          }
        });
      } else if (lastAttempt.answers) {
        // Fallback: calculate failed questions based on stored answers
        questions.forEach(question => {
          const userAnswer = lastAttempt.answers[question.id];
          if (userAnswer && userAnswer !== question.correct_answer) {
            failedQuestionIds.add(question.id);
          }
        });
      }
    }

    // Separate failed and successful questions
    const failedQuestions = questions.filter(q => failedQuestionIds.has(q.id));
    const successfulQuestions = questions.filter(q => !failedQuestionIds.has(q.id));

    // Return failed questions first, then successful ones
    const reorderedQuestions = [...failedQuestions, ...successfulQuestions];

    return NextResponse.json({
      failedQuestions: failedQuestions,
      allQuestions: reorderedQuestions,
      hasFailedQuestions: failedQuestions.length > 0,
      totalQuestions: questions.length,
      failedCount: failedQuestions.length
    });

  } catch (error) {
    console.error('Error in failed questions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
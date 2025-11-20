/**
 * Progress tracking utilities for exercises
 */

import { createClient } from '@/lib/supabase/client';

export interface QuestionResult {
  question_id: number | string;
  question_text: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  attempts: number;
  timestamp: string;
}

/**
 * Saves or updates exercise progress for a user
 * @param userId - The user's ID
 * @param exerciseId - The exercise ID
 * @param questionResult - The question result to save
 * @param isCorrect - Whether the answer was correct
 * @returns The saved progress data or null on error
 */
export async function saveExerciseProgress(
  userId: string,
  exerciseId: number,
  questionResult: QuestionResult,
  isCorrect: boolean
): Promise<any> {
  console.log('💾 Saving exercise progress:', {
    userId,
    exerciseId,
    isCorrect,
    questionText: questionResult.question_text
  });

  const supabase = createClient();

  try {
    // Get existing progress to preserve question_results array
    const { data: existingProgress, error: fetchError } = await supabase
      .from('user_progress')
      .select('question_results')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching existing progress:', fetchError);
    }

    // Get existing question results array or start with empty array
    let questionResults: QuestionResult[] = [];
    if (existingProgress?.question_results) {
      if (Array.isArray(existingProgress.question_results)) {
        questionResults = existingProgress.question_results;
      } else {
        // Convert single object to array format
        questionResults = [existingProgress.question_results];
      }
    }

    // Append new question result
    questionResults.push(questionResult);

    const upsertData = {
      user_id: userId,
      exercise_id: exerciseId,
      completed: isCorrect,
      score: isCorrect ? 100 : 0,
      completed_at: new Date().toISOString(),
      question_results: questionResults
    };

    const { data: upsertResult, error: upsertError } = await supabase
      .from('user_progress')
      .upsert(upsertData, {
        onConflict: 'user_id,exercise_id'
      });

    if (upsertError) {
      console.error('❌ Error upserting progress:', upsertError);
      throw upsertError;
    }

    console.log('✅ Progress saved successfully');
    return upsertResult;

  } catch (error: any) {
    console.error('💥 Error in saveExerciseProgress:', error);
    return null;
  }
}

/**
 * Counts total answered questions for a user across multiple exercises
 * @param progressData - Array of user progress records
 * @returns Total count of answered questions
 */
export function countAnsweredQuestions(progressData: any[]): number {
  let totalAnsweredQuestions = 0;
  progressData.forEach(record => {
    if (record.question_results) {
      if (Array.isArray(record.question_results)) {
        totalAnsweredQuestions += record.question_results.length;
      } else {
        // Legacy single object format
        totalAnsweredQuestions += 1;
      }
    }
  });
  return totalAnsweredQuestions;
}

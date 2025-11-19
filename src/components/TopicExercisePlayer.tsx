'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TargetLanguage } from '@/types/database';

interface Exercise {
  id: number;
  question_da: string;
  question: string; // Question in target language (es/pt/etc)
  correct_answer: string;
  options?: string[];
  type: string;
  explanation_da?: string; // Added explanation field
  sentence_translation_da?: string; // Added Danish translation of full sentence
  originalExerciseId?: number; // For tracking the original exercise ID in retry mode
  questionIndex?: number; // For tracking which question within the original exercise
}

interface Topic {
  id: string;
  name_da: string;
  description_da: string;
  level: string;
}

export default function TopicExercisePlayer({ 
  topicId, 
  retryMode = false,
  reviewMode = false,
  wrongAnswerExerciseIds = []
}: { 
  topicId: string;
  retryMode?: boolean;
  reviewMode?: boolean;
  wrongAnswerExerciseIds?: string[];
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]); // Track all exercises for mastery calculation
  const [wrongAnswers, setWrongAnswers] = useState<Set<number>>(new Set()); // Track wrong answers in current session
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('es');
  const router = useRouter();
  const supabase = createClient();

  // 🔍 DEBUG: Log component initialization
  console.log('🚀 TOPIC EXERCISE PLAYER INITIALIZED:', {
    topicId,
    retryMode,
    reviewMode,
    wrongAnswerExerciseIds,
    wrongAnswerCount: wrongAnswerExerciseIds?.length || 0,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('🔄 useEffect triggered for fetchExercises');
    fetchExercises();
  }, [topicId]);

  const fetchExercises = async () => {
    setLoading(true);
    
    // 🔍 DEBUG: Log initial state and parameters
    console.log('🔍 FETCH EXERCISES DEBUG:', {
      topicId,
      retryMode,
      reviewMode,
      wrongAnswerExerciseIds,
      wrongAnswerCount: wrongAnswerExerciseIds?.length || 0,
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR',
      searchParams: typeof window !== 'undefined' ? Object.fromEntries(new URLSearchParams(window.location.search)) : 'SSR'
    });
    
    try {
      // Get user's target language
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('❌ No user found');
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('target_language')
        .eq('id', currentUser.id)
        .single();

      const targetLanguage = userData?.target_language || 'es';
      console.log('🌍 User target language:', targetLanguage);
      setTargetLanguage(targetLanguage);

      // Always fetch all exercises for mastery tracking, filtered by language
      const { data: allData, error: allError } = await supabase
        .from('exercises')
        .select('*')
        .eq('topic_id', topicId)
        .eq('target_language', targetLanguage)
        .order('id', { ascending: true });
      
      if (allError) throw allError;
      setAllExercises(allData || []);

      // 📊 DEBUG: Log all exercises found
      console.log('📊 ALL EXERCISES LOADED:', {
        totalCount: allData?.length || 0,
        exerciseIds: allData?.map(e => e.id) || [],
        exerciseDetails: allData?.map(ex => ({
          id: ex.id,
          questionCount: ex.content?.questions?.length || 0,
          hasMultipleQuestions: (ex.content?.questions?.length || 0) > 1,
          questions: ex.content?.questions || [],
          firstQuestion: ex.content?.questions?.[0] || null,
          allQuestions: ex.content?.questions?.map((q, idx) => `Q${idx + 1}: ${q.question_da || q.question || 'No question'}`) || [],
          fullContent: ex.content
        })) || []
      });

      // ✅ SAFETY CHECK: Ensure allData exists and has valid structure
      if (!allData || allData.length === 0) {
        console.log('❌ NO EXERCISES FOUND: Database returned empty result');
        setExercises([]);
        setLoading(false);
        return;
      }

      // ✅ FIX: Check for retry mode with no wrong answers OR review mode logic
      // 🚨 CRITICAL: Only trigger early exit for RETRY mode when no wrong answers exist
      // For REVIEW mode, show available exercises regardless of wrongAnswerExerciseIds
      if (retryMode && wrongAnswerExerciseIds && wrongAnswerExerciseIds.length === 0) {
        console.log('🎆 EARLY EXIT: Retry mode detected with no wrong answers to retry');
        console.log('🔄 Mode: RETRY, redirecting to dashboard with mastery message');
        setExercises([]); // Empty exercises to trigger completion UI
        setProgress(100); // Show completed state
        setLoading(false);
        // Show mastery message and redirect after delay
        setTimeout(() => {
          router.push('/dashboard?message=all-questions-mastered');
        }, 2000);
        return;
      }

      // 🚨 FIX: Proper exercise filtering logic for all three modes
      let exercisesToShow: any[] = [];
      
      if (!retryMode && !reviewMode) {
        // 📚 NORMAL MODE: Use all exercises from database
        exercisesToShow = allData || [];
        console.log('🎯 NORMAL MODE: Using all exercises', {
          totalExercises: exercisesToShow.length,
          exercises: exercisesToShow.map(e => e?.id || 'no-id')
        });
      } else if (reviewMode) {
        // 🔄 REVIEW MODE: Use ALL exercises for practice/review
        exercisesToShow = allData || [];
        console.log('🔄 REVIEW MODE: Using all exercises for practice', {
          totalExercises: exercisesToShow.length,
          exercises: exercisesToShow.map(e => e?.id || 'no-id'),
          exerciseDetails: exercisesToShow.map(e => ({
            id: e?.id || 'no-id',
            questionCount: e?.content?.questions?.length || 1,
            title: e?.content?.question_da || 'Unknown exercise'
          }))
        });
      } else if (retryMode && wrongAnswerExerciseIds.length > 0) {
        // 🔄 RETRY MODE: Create individual question exercises ONLY for wrong questions
        console.log('🔄 RETRY MODE: Creating individual questions for wrong answers only');
        
        // Parse wrongAnswerExerciseIds to get specific question IDs (format: exerciseId + questionIndex)
        const wrongQuestionIds = wrongAnswerExerciseIds.map(id => parseInt(id, 10));
        console.log('🔄 RETRY FILTERING DETAILED DEBUG:', {
          wrongAnswerExerciseIds,
          wrongQuestionIds,
          allAvailableExerciseIds: allData?.map(e => e?.id || 'no-id') || [],
          totalAvailableExercises: allData?.length || 0
        });

        // Find exercises and identify specific wrong questions
        exercisesToShow = [];
        for (const wrongQuestionId of wrongQuestionIds) {
          // Extract original exercise ID and question index from compound ID
          const originalExerciseId = Math.floor(wrongQuestionId / 1000);
          const questionIndex = wrongQuestionId % 1000;
          
          // Find the original exercise
          const exercise = allData?.find(e => e?.id === originalExerciseId);
          if (exercise && exercise.content?.questions && Array.isArray(exercise.content.questions)) {
            const question = exercise.content.questions[questionIndex];
            if (question) {
              // Create individual exercise object for this specific wrong question
              exercisesToShow.push({
                ...exercise,
                id: wrongQuestionId, // Use the compound ID
                content: {
                  ...exercise.content,
                  questions: [question], // Only this specific question
                  question_da: question.question_da || '', // Direct access for compatibility
                  originalExerciseId: originalExerciseId,
                  questionIndex: questionIndex
                }
              });
            }
          }
        }
        
        // 🔍 DEBUG: Log retry mode filtering results
        console.log('🔄 RETRY FILTERING RESULTS:', {
          wrongQuestionIds: wrongQuestionIds.length,
          individualQuestionsCreated: exercisesToShow.length,
          questionDetails: exercisesToShow.map(e => ({ 
            id: e?.id || 'no-id', 
            originalId: e?.content?.originalExerciseId || 'no-original',
            questionIndex: e?.content?.questionIndex || 0,
            question: e?.content?.questions?.[0]?.question_da || 'no-question'
          }))
        });
      } else {
        // 🔄 RETRY MODE with no wrong exercises: Use empty array (redirect will happen later)
        exercisesToShow = [];
        console.log('🔄 RETRY MODE: No wrong exercises found, will redirect');
      }

      // ✅ ADDITIONAL NULL CHECK: Verify exercisesToShow has valid content
      if (!exercisesToShow || exercisesToShow.length === 0) {
        console.log('❌ NO EXERCISES TO SHOW: After filtering, no valid exercises found');
        setExercises([]);
        setLoading(false);
        return;
      }

      // 🔧 DEBUG: Log transformation details before setting exercises
      console.log('🔧 EXERCISE TRANSFORMATION DEBUG:', {
        mode: reviewMode ? 'REVIEW' : (retryMode ? 'RETRY' : 'NORMAL'),
        exercisesToShowCount: exercisesToShow.length,
        transformationDetails: exercisesToShow.map(dbExercise => ({
          exerciseId: dbExercise?.id || 'no-id',
          hasContent: !!dbExercise?.content,
          hasQuestions: !!dbExercise?.content?.questions,
          totalQuestionsInExercise: dbExercise?.content?.questions?.length || 0,
          firstQuestionText: dbExercise?.content?.questions?.[0]?.question_da || 'No question',
          allQuestionsText: dbExercise?.content?.questions?.map(q => q?.question_da || 'no-text') || [],
          willExpandAllQuestions: reviewMode // In review mode, expand all questions!
        }))
      });

      // 🎯 FIX: For review mode, expand multi-question exercises into individual questions
      const expandedExercises: Exercise[] = [];
      
      exercisesToShow.forEach(dbExercise => {
        // ✅ NULL CHECK: Ensure dbExercise has valid structure
        if (!dbExercise || !dbExercise.content) {
          console.log('⚠️ SKIPPING EXERCISE: Missing content', { exerciseId: dbExercise?.id || 'unknown' });
          return;
        }

        const questions = dbExercise.content.questions || [];
        
        // ✅ NULL CHECK: Ensure questions array is valid
        if (!Array.isArray(questions) || questions.length === 0) {
          console.log('⚠️ SKIPPING EXERCISE: No valid questions', { 
            exerciseId: dbExercise.id,
            hasQuestions: !!dbExercise.content.questions,
            isArray: Array.isArray(dbExercise.content.questions),
            length: dbExercise.content.questions?.length || 0
          });
          return;
        }
        
        if (reviewMode && questions.length > 1) {
          // 🔄 REVIEW MODE: Expand all questions from multi-question exercise
          questions.forEach((question, questionIndex) => {
            // ✅ NULL CHECK: Ensure question has required fields
            if (!question || !question.question_da) {
              console.log('⚠️ SKIPPING QUESTION: Missing required fields', { 
                exerciseId: dbExercise.id,
                questionIndex,
                hasQuestion: !!question,
                hasQuestionDa: !!question?.question_da
              });
              return;
            }

            expandedExercises.push({
              id: dbExercise.id * 1000 + questionIndex, // Compound ID for unique identification
              question_da: question.question_da,
              question: question.question || '',
              correct_answer: question.correct_answer || '',
              options: question.options || [],
              type: question.type || 'translation',
              explanation_da: question.explanation_da || '',
              sentence_translation_da: question.sentence_translation_da || '',
              // Store original exercise info for progress saving
              originalExerciseId: dbExercise.id,
              questionIndex: questionIndex
            } as Exercise);
          });
        } else {
          // 🔄 NORMAL/RETRY MODE or single-question exercise: Use first question only
          const firstQuestion = questions[0] || dbExercise.content;
          
          // ✅ NULL CHECK: Ensure first question has required fields
          if (!firstQuestion || !firstQuestion.question_da) {
            console.log('⚠️ SKIPPING EXERCISE: First question missing required fields', { 
              exerciseId: dbExercise.id,
              hasFirstQuestion: !!firstQuestion,
              hasQuestionDa: !!firstQuestion?.question_da
            });
            return;
          }

          expandedExercises.push({
            id: dbExercise.id,
            question_da: firstQuestion?.question_da || dbExercise.content?.question_da || '',
            question: firstQuestion?.question || dbExercise.content?.question || '',
            correct_answer: firstQuestion?.correct_answer || dbExercise.content?.correct_answer || '',
            options: firstQuestion?.options || dbExercise.content?.options || [],
            type: firstQuestion?.type || dbExercise.content?.type || 'translation',
            explanation_da: firstQuestion?.explanation_da || dbExercise.content?.explanation_da || '',
            sentence_translation_da: firstQuestion?.sentence_translation_da || dbExercise.content?.sentence_translation_da || '',
            // Store original exercise info for progress saving
            originalExerciseId: dbExercise.content?.originalExerciseId || dbExercise.id,
            questionIndex: dbExercise.content?.questionIndex || 0
          } as Exercise);
        }
      });

      console.log('🎉 EXERCISE EXPANSION COMPLETE:', {
        originalExercises: exercisesToShow.length,
        expandedExercises: expandedExercises.length,
        expansionDetails: expandedExercises.map(ex => ({
          id: ex.id,
          originalExerciseId: ex.originalExerciseId,
          questionIndex: ex.questionIndex,
          questionPreview: ex.question_da?.substring(0, 50) + '...'
        }))
      });

      // ✅ FINAL VALIDATION: Ensure we have valid exercises after expansion
      if (!expandedExercises || expandedExercises.length === 0) {
        console.log('⚠️ NO VALID EXERCISES AFTER EXPANSION - Returning to dashboard');
        setError('Ingen gyldige øvelser fundet efter behandling');
        setLoading(false);
        return;
      }

      setExercises(expandedExercises);
      
      // ✅ FIX: Proper progress calculation for each mode
      let totalForProgress: number;
      if (reviewMode) {
        // Review mode: use all exercises
        totalForProgress = allData?.length || 0;
      } else if (retryMode) {
        // Retry mode: use wrong answer exercises
        totalForProgress = wrongAnswerExerciseIds.length;
      } else {
        // Normal mode: use all exercises
        totalForProgress = allData?.length || 0;
      }
      
      const safeTotal = Math.max(totalForProgress, 1); // Ensure minimum of 1
      const safeCurrentIndex = Math.min(currentIndex, safeTotal - 1);
      const initialProgress = totalForProgress > 0 ? Math.min(((safeCurrentIndex + 1) / safeTotal) * 100, 100) : 0;
      
      // 📊 DEBUG: Log progress calculation
      console.log('📊 PROGRESS CALCULATION DEBUG:', {
        mode: reviewMode ? 'REVIEW' : (retryMode ? 'RETRY' : 'NORMAL'),
        currentIndex,
        totalForProgress,
        safeTotal,
        safeCurrentIndex,
        initialProgress,
        exercisesToShowCount: exercisesToShow.length,
        allDataLength: allData?.length || 0
      });
      
      setProgress(initialProgress);
      
      // Initialize progress display message
      if (retryMode && wrongAnswerExerciseIds.length > 0) {
        console.log(`🔄 Starting retry mode with ${wrongAnswerExerciseIds.length} questions to master`);
      } else if (!retryMode) {
        console.log(`📚 Starting normal mode with ${allData?.length || 0} total questions`);
      }
      
    } catch (err) {
      console.error('❌ ERROR in fetchExercises:', err);
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    const correctAnswer = Array.isArray(exercises[currentIndex].correct_answer) 
      ? exercises[currentIndex].correct_answer[0] 
      : exercises[currentIndex].correct_answer;
    const correct = normalizeText(userAnswer) === normalizeText(correctAnswer);
    setIsCorrect(correct);
    setShowContinue(true);

    // Track wrong answers for mastery system
    if (!correct) {
      setWrongAnswers(prev => new Set([...prev, exercises[currentIndex].id]));
    } else if (retryMode) {
      // If in retry mode and answered correctly, remove from wrong answers
      setWrongAnswers(prev => {
        const newSet = new Set(prev);
        newSet.delete(exercises[currentIndex].id);
        console.log('✅ Correct answer in retry mode! Removed', exercises[currentIndex].id, 'Remaining wrong:', newSet.size);
        return newSet;
      });
    }

    // Save progress in both normal mode and retry mode (when answered correctly)
    if (!reviewMode) {
      if (!retryMode || correct) {
        // In normal mode: always save
        // In retry mode: only save if correct (to update the wrong answer to correct)
        saveProgress(currentIndex, correct);
        console.log(`💾 Progress saved - Mode: ${retryMode ? 'RETRY' : 'NORMAL'}, Correct: ${correct}`);
      } else {
        console.log('🔄 Retry mode with wrong answer: No progress saved (will retry again)');
      }
    } else {
      console.log('📖 Review mode: No progress saved');
    }
  };

  const handleContinue = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowContinue(false);
    
    // 🔍 DEBUG: Log continue state
    console.log('🔍 HANDLE CONTINUE DEBUG:', {
      currentIndex,
      exercisesLength: exercises.length,
      mode: reviewMode ? 'REVIEW' : (retryMode ? 'RETRY' : 'NORMAL'),
      retryMode,
      reviewMode,
      wrongAnswerExerciseIds,
      wrongAnswersSize: wrongAnswers.size,
      wrongAnswersArray: Array.from(wrongAnswers)
    });
    
    // 🎯 RETRY MODE COMPLETION CHECK: If retry mode and no more wrong answers, complete immediately
    if (retryMode && wrongAnswers.size === 0) {
      console.log('🎆 RETRY COMPLETED! All wrong answers mastered - switching to review mode...');
      setProgress(100);
      router.push(`/topic/${topicId}/player?mode=review`);
      return;
    }
    
    if (currentIndex < exercises.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      // ✅ FIX: Prevent division by zero in progress calculation
      const totalForProgress = (retryMode || reviewMode) ? wrongAnswerExerciseIds.length : exercises.length;
      const safeTotal = Math.max(totalForProgress, 1); // Ensure minimum of 1
      const safeNextIndex = Math.min(nextIndex + 1, totalForProgress);
      const newProgress = totalForProgress > 0 ? Math.min((safeNextIndex / safeTotal) * 100, 100) : 100;
      
      // 📊 DEBUG: Log progress update calculation
      console.log('📊 PROGRESS UPDATE DEBUG:', {
        nextIndex,
        totalForProgress,
        safeTotal,
        safeNextIndex,
        calculatedProgress: (safeNextIndex / safeTotal) * 100,
        finalProgress: newProgress,
        mode: reviewMode ? 'REVIEW' : (retryMode ? 'RETRY' : 'NORMAL')
      });
      
      setProgress(newProgress);
      
      // 📋 DEBUG: Show current question progress
      console.log(`📋 QUESTION ${nextIndex + 1} of ${exercises.length} (Mode: ${reviewMode ? 'REVIEW' : (retryMode ? 'RETRY' : 'NORMAL')}, Progress: ${newProgress.toFixed(1)}%)`);
      
    } else {
      // All current questions completed - check mastery status
      console.log('🎯 ALL QUESTIONS COMPLETED - Determining next action...');
      setProgress(100);
      
      if (retryMode) {
        console.log('🔄 RETRY MODE COMPLETION:', {
          remainingWrongAnswers: wrongAnswers.size,
          wrongAnswersArray: Array.from(wrongAnswers)
        });
        
        // In retry mode: check if all wrong questions are now correct
        if (wrongAnswers.size === 0) {
          // All retry questions answered correctly - switch to review mode without saving progress
          console.log('� RETRY COMPLETED! Switching to review mode...');
          
          // Redirect to the same topic in review mode
          router.push(`/topic/${topicId}/player?mode=review`);
          return;
        } else {
          // Still have wrong answers - offer another retry
          console.log('🔄 RETRY AVAILABLE: Some questions still need practice');
          router.push('/dashboard?message=retry-available');
        }
      } else if (reviewMode) {
        console.log('🔄 REVIEW MODE COMPLETION - No progress saved');
        // Review mode completed - just return to dashboard
        router.push('/dashboard?message=review-completed');
      } else {
        console.log('📚 NORMAL MODE COMPLETION:', {
          totalWrongAnswers: wrongAnswers.size,
          wrongAnswersArray: Array.from(wrongAnswers)
        });
        
        // Initial attempt: check if any wrong answers exist
        if (wrongAnswers.size === 0) {
          // Perfect score - topic mastered!
          console.log('🎆 PERFECT SCORE! Topic mastered on first attempt');
          router.push('/dashboard?message=topic-mastered');
        } else {
          // Some wrong answers - offer retry mode
          console.log(`🔄 RETRY NEEDED: ${wrongAnswers.size} questions need practice`);
          router.push(`/dashboard?message=needs-retry&topicId=${topicId}&wrongAnswers=${Array.from(wrongAnswers).join(',')}`);
        }
      }
    }
  };

  const handleStop = () => {
    router.push('/dashboard');
  };

  const saveProgress = async (index: number, correct: boolean) => {
    // Save user progress to Supabase using correct user_progress table
    console.log('🔥 STARTING PROGRESS SAVE OPERATION');
    
    // Prevent unnecessary saves in retry/review mode when all questions already mastered
    if ((retryMode || reviewMode) && wrongAnswerExerciseIds.length === 0) {
      console.log(`📝 SAVE PREVENTION: ${reviewMode ? 'Review' : 'Retry'} mode with all questions mastered, skipping save operation`);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No session found - aborting save');
        return;
      }

      console.log('✅ Session found, user_id:', session.user.id);
      
      // 🚀 RETRY MODE FIX: Use original exercise ID for progress saving
      const exerciseIdForSaving = exercises[index].originalExerciseId || exercises[index].id;
      const questionIndexForSaving = exercises[index].questionIndex || 0;
      
      console.log('📝 Saving progress for:', {
        user_id: session.user.id,
        exercise_id: exerciseIdForSaving, // Use original exercise ID
        display_id: exercises[index].id, // The modified ID for display
        question_index: questionIndexForSaving,
        correct,
        userAnswer,
        correctAnswer: exercises[index].correct_answer,
        question_text: exercises[index].question_da
      });

      // First, get existing progress to preserve question_results array
      console.log('📊 Fetching existing progress for exercise:', exerciseIdForSaving);
      const { data: existingProgress, error: fetchError } = await supabase
        .from('user_progress')
        .select('question_results')
        .eq('user_id', session.user.id)
        .eq('exercise_id', exerciseIdForSaving)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing progress:', fetchError);
      } else {
        console.log('📋 Existing progress found:', existingProgress);
      }

      // Create new question result object
      const newQuestionResult = {
        question_id: exercises[index].id, // Use the display ID (includes question index info)
        question_text: exercises[index].question_da,
        question_index: questionIndexForSaving, // Track which question within the exercise
        original_exercise_id: exerciseIdForSaving, // Track the original exercise ID
        correct: correct,
        userAnswer: userAnswer,
        correctAnswer: exercises[index].correct_answer,
        timestamp: new Date().toISOString()
      };
      console.log('🆕 Created new question result:', newQuestionResult);

      // Track mastery progress
      if (!correct) {
        wrongAnswers.add(exercises[index].id);
        console.log(`❌ Wrong answer tracked for exercise ${exercises[index].id}. Total wrong: ${wrongAnswers.size}`);
      } else if (retryMode) {
        // In retry mode, correct answers remove from wrongAnswers set
        wrongAnswers.delete(exercises[index].id);
        console.log(`✅ Correct answer in retry mode! Removed ${exercises[index].id}. Remaining wrong: ${wrongAnswers.size}`);
      }

      // Get existing question results array or start with empty array
      let questionResults = [];
      if (existingProgress?.question_results) {
        // If existing data is array, use it; if single object, convert to array
        if (Array.isArray(existingProgress.question_results)) {
          questionResults = existingProgress.question_results;
          console.log('📋 Using existing array of', questionResults.length, 'questions');
        } else {
          questionResults = [existingProgress.question_results];
          console.log('🔄 Converting single object to array format');
        }
      } else {
        console.log('🆕 Starting with empty question results array');
      }

      // In retry mode, replace the wrong answer instead of appending
      if (retryMode && correct) {
        // Find and replace any existing result for this specific question
        const existingIndex = questionResults.findIndex(result => 
          result.question_id === exercises[index].id || 
          (result.original_exercise_id === exerciseIdForSaving && result.question_index === questionIndexForSaving)
        );
        
        if (existingIndex !== -1) {
          console.log(`🔄 RETRY MODE: Replacing wrong answer at index ${existingIndex} with correct answer for question ${questionIndexForSaving}`);
          questionResults[existingIndex] = newQuestionResult;
        } else {
          console.log('🔄 RETRY MODE: No existing wrong answer found for this specific question, adding new result');
          questionResults.push(newQuestionResult);
        }
      } else {
        // Normal mode or wrong answer - append new question result
        questionResults.push(newQuestionResult);
        console.log('➕ Added new question, total questions now:', questionResults.length);
      }

      const upsertData = {
        user_id: session.user.id,
        exercise_id: exercises[index].originalExerciseId || exercises[index].id, // Use original exercise ID for database
        completed: correct,
        score: correct ? 100 : 0,
        attempts: 1,
        completed_at: correct ? new Date().toISOString() : null,
        question_results: questionResults  // Now an array of all answered questions
      };

      console.log('💾 ATTEMPTING UPSERT with ORIGINAL EXERCISE ID:', exercises[index].originalExerciseId, 'instead of compound:', exercises[index].id);
      console.log('💾 ATTEMPTING UPSERT with data:', upsertData);

      const { data: upsertResult, error: upsertError } = await supabase
        .from('user_progress')
        .upsert(upsertData, {
          onConflict: 'user_id,exercise_id'
        });

      if (upsertError) {
        console.error('❌ UPSERT ERROR:', {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        });
        throw upsertError;
      }

      console.log('✅ PROGRESS SAVED SUCCESSFULLY!');
      console.log('📊 Final question results array length:', questionResults.length);
      console.log('🎯 Upsert result:', upsertResult);
      
    } catch (err: any) {
      console.error('💥 ERROR IN SAVE PROGRESS:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        status: err.status,
        statusText: err.statusText
      });
      
      // Log additional error context
      if (err.status === 406) {
        console.error('🚨 HTTP 406 (Not Acceptable) - Server rejected request format');
      } else if (err.status === 409) {
        console.error('🚨 HTTP 409 (Conflict) - Data conflict during upsert');
      }
    }
  };

  function normalizeText(text: string) {
    return text
      .toLowerCase()
      .trim()
      // Normalize Spanish special characters to basic letters
      .replace(/[áàâäã]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      // Remove all punctuation and special characters
      .replace(/[.,!?;:'"()\[\]{}¡¿]/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (loading) {
    return <div className="p-8 text-center">Loading exercises...</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fejl</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Tilbage til dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ingen øvelser endnu</h1>
          <p className="text-gray-600 mb-6">
            Der er ikke oprettet øvelser for dette emne endnu.
          </p>
          <div className="space-x-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Tilbage til dashboard
            </Link>
            <Link 
              href="/admin/exercise-generator"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generer øvelser
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main Duolingo-style exercise interface matching the working topic page
  const currentQuestion = exercises[currentIndex];

  // Debug logging for retry mode
  if (retryMode) {
    console.log('🔍 Retry Mode Debug:', {
      exercises: exercises.length,
      currentIndex,
      currentQuestion: !!currentQuestion,
      wrongAnswerExerciseIds,
      firstExerciseId: exercises[0]?.id
    });
  }

  // Debug logging for current question
  console.log('🔍 Current Question Debug:', {
    currentIndex,
    exercisesLength: exercises.length,
    currentQuestion: currentQuestion ? {
      id: currentQuestion.id,
      hasQuestionDa: !!currentQuestion.question_da,
      questionDa: currentQuestion.question_da,
      questionType: currentQuestion.type,
      hasOptions: !!currentQuestion.options?.length
    } : 'currentQuestion is undefined'
  });

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4 text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-semibold text-gray-800 mb-4">No question available</div>
          <div className="text-sm text-gray-600 mb-6">
            {retryMode ? (
              <>
                Retry mode: Looking for exercises {wrongAnswerExerciseIds?.join(', ')}<br />
                Found {exercises.length} matching exercises
              </>
            ) : (
              <>
                {reviewMode ? 'Review mode' : 'Normal mode'}: {exercises.length} exercises available
              </>
            )}
          </div>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const completedCount = currentIndex; // For progress calculation

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header matching working topic page */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleStop}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex-1 max-w-md">
                <div className="text-sm text-gray-600 mb-1">
                  <div>
                    {retryMode 
                      ? `Retry Mode - Spørgsmål ${Math.min(currentIndex + 1, exercises.length)} af ${exercises.length}`
                      : reviewMode 
                        ? `Review Mode - Spørgsmål ${Math.min(currentIndex + 1, exercises.length)} af ${exercises.length}`
                        : `Spørgsmål ${Math.min(currentIndex + 1, exercises.length)} af ${exercises.length}`
                    }
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(((completedCount + 1) / exercises.length) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {Math.round(((completedCount + 1) / exercises.length) * 100)}% fuldført
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Content matching working topic page */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Question */}
          <div className="mb-8">
            {/* Target language question as main heading */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentQuestion.question || currentQuestion.question_da}
            </h2>
            {/* Danish translation as reference */}
            {currentQuestion.sentence_translation_da && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-600 font-medium mb-1">💡 Dansk oversættelse:</div>
                <div className="text-sm text-blue-800 italic">
                  {currentQuestion.sentence_translation_da}
                </div>
              </div>
            )}
          </div>

          {/* Answer Input matching working topic page */}
          <div className="mb-6">
            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              // Multiple choice with beautiful styling
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`w-full p-4 border-2 rounded-xl text-left font-medium transition-all ${
                      normalizeText(userAnswer) === normalizeText(option)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    } ${isCorrect !== null ? 'pointer-events-none' : ''}`}
                    onClick={() => setUserAnswer(option)}
                    disabled={isCorrect !== null}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              // Text input with beautiful styling
              <div>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Skriv dit svar på spansk..."
                  disabled={isCorrect !== null}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && userAnswer.trim() && isCorrect === null) {
                      handleCheckAnswer();
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Feedback matching working topic page */}
          {isCorrect === true && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Rigtig! 🎉
              </div>
              {currentQuestion.explanation_da && (
                <p className="text-green-600 text-sm">
                  {currentQuestion.explanation_da}
                </p>
              )}
            </div>
          )}

          {isCorrect === false && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Ikke rigtigt
              </div>
              <p className="text-red-600 text-sm mb-2">
                Det rigtige svar er: <strong>{Array.isArray(currentQuestion.correct_answer) ? currentQuestion.correct_answer[0] : currentQuestion.correct_answer}</strong>
              </p>
              {currentQuestion.explanation_da && (
                <p className="text-red-600 text-sm">
                  {currentQuestion.explanation_da}
                </p>
              )}
            </div>
          )}

          {/* Mastery Status Display */}
          {(retryMode || reviewMode) && wrongAnswers.size > 0 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-2 text-orange-700 font-semibold mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {reviewMode ? 'Gennemgang' : 'Forsøg igen'}
              </div>
              <p className="text-orange-600 text-sm">
                {wrongAnswers.size} spørgsmål skal stadig besvares korrekt
              </p>
            </div>
          )}

          {/* Action Buttons matching working topic page */}
          <div className="flex gap-4">
            {isCorrect === null ? (
              <button
                onClick={handleCheckAnswer}
                disabled={!userAnswer.trim()}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  userAnswer.trim()
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Tjek svar
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className="flex-1 py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
              >
                {currentIndex < exercises.length - 1 
                  ? 'Fortsæt' 
                  : (retryMode || reviewMode)
                    ? (wrongAnswers.size === 0 ? 'Fuldført!' : `Afslut ${reviewMode ? 'gennemgang' : 'forsøg'}`)
                    : (wrongAnswers.size === 0 ? 'Afslut emne!' : 'Afslut')
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
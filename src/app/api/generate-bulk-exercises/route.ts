import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAdvancedExercise } from '@/lib/openai-advanced';
import { SpanishLevel } from '@/types/database';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Constants
const VALID_LEVELS: SpanishLevel[] = ['A1', 'A2', 'B1'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_EXERCISE_TYPES = ['multiple_choice', 'fill_blank', 'translation', 'conjugation', 'sentence_structure'];
const MAX_QUESTIONS_PER_REQUEST = 50; // Increased from 5 to 50 to allow bulk generation
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());

// Map question types to exercise types according to database schema
function getExerciseTypeFromQuestionType(questionType: string): string {
  const mapping: Record<string, string> = {
    'multiple_choice': 'grammar',
    'fill_blank': 'grammar', 
    'translation': 'vocabulary',
    'conjugation': 'conjugation',
    'sentence_structure': 'sentence_structure'
  };
  return mapping[questionType] || 'grammar';
}

interface RequestBody {
  topicId: number;
  exerciseType: string;
  count: number;
  difficulty?: string;
  level: SpanishLevel;
  topicName: string;
  topicDescription?: string;
  difficultyDistribution?: Record<string, number>;
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🚀 [${requestId}] Starting simple exercise generation...`);
  
  try {
    // Simple authentication check
    console.log(`🔐 [${requestId}] Checking authentication...`);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error(`❌ [${requestId}] Authentication failed:`, authError);
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to generate exercises'
      }, { status: 401 });
    }

    // Simple admin check
    console.log(`🔑 [${requestId}] Checking admin permissions...`);
    const isAdmin = ADMIN_EMAILS.includes(user.email || '');
    
    if (!isAdmin) {
      console.log(`❌ [${requestId}] Access denied for user: ${user.email}`);
      return NextResponse.json({ 
        error: 'Access denied',
        message: 'Only administrators can generate exercises'
      }, { status: 403 });
    }

    console.log(`✅ [${requestId}] Admin access granted for: ${user.email}`);

    // Parse request body
    console.log(`📝 [${requestId}] Parsing request body...`);
    let body: RequestBody;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON parsing failed:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      }, { status: 400 });
    }

    console.log(`📦 [${requestId}] Request:`, JSON.stringify(body, null, 2));

    // Simple validation
    const { 
      topicId, 
      exerciseType, 
      count, 
      difficulty, 
      level, 
      topicName, 
      topicDescription,
      difficultyDistribution
    } = body;

    // Validate required fields
    if (!topicId) {
      return NextResponse.json({ 
        error: 'Missing topicId',
        message: 'topicId is required'
      }, { status: 400 });
    }

    if (!exerciseType || !VALID_EXERCISE_TYPES.includes(exerciseType)) {
      return NextResponse.json({ 
        error: 'Invalid exerciseType',
        message: `exerciseType must be one of: ${VALID_EXERCISE_TYPES.join(', ')}`
      }, { status: 400 });
    }

    if (!count || count <= 0) {
      return NextResponse.json({ 
        error: 'Invalid count',
        message: 'count must be a positive number'
      }, { status: 400 });
    }

    if (!level || !VALID_LEVELS.includes(level)) {
      return NextResponse.json({ 
        error: 'Invalid level',
        message: `level must be one of: ${VALID_LEVELS.join(', ')}`
      }, { status: 400 });
    }

    if (!topicName) {
      return NextResponse.json({ 
        error: 'Missing topicName',
        message: 'topicName is required'
      }, { status: 400 });
    }

    // Apply request limits - count now refers to exercises, not questions
    const actualExerciseCount = Math.min(count, Math.floor(MAX_QUESTIONS_PER_REQUEST / 6)); // Assume ~6 questions per exercise
    if (count > Math.floor(MAX_QUESTIONS_PER_REQUEST / 6)) {
      console.log(`⚠️ [${requestId}] Requested ${count} exercises, limiting to ${actualExerciseCount} to stay within question limit`);
    }

    console.log(`✅ [${requestId}] Will generate ${actualExerciseCount} exercises (targeting 5-8 questions each)`);

    console.log(`✅ [${requestId}] All validations passed`);

    // Generate exercises with OpenAI
    console.log(`🤖 [${requestId}] Starting AI generation...`);
    
    const difficulties = difficultyDistribution 
      ? Object.entries(difficultyDistribution).filter(([_, percentage]) => (percentage as number) > 0)
      : [[difficulty || 'medium', 100]];

    const allGeneratedExercises = [];
    let totalQuestions = 0;
    let totalExercisesGenerated = 0;

    for (const [difficultyLevel, percentage] of difficulties) {
      const exerciseCount = Math.ceil((actualExerciseCount * (percentage as number)) / 100);
      
      if (exerciseCount <= 0) continue;

      console.log(`🎯 [${requestId}] Generating ${exerciseCount} ${difficultyLevel} exercises...`);

      // Generate in optimized batches for GPT-4o speed and reliability
      const questionsNeeded = exerciseCount * 4; // 4 questions per exercise
      const batchSize = 8; // Optimized batch size for GPT-4o speed (reduced from 12)
      const batches = Math.ceil(questionsNeeded / batchSize);
      
      const allQuestionsForDifficulty = [];
      
      for (let batch = 0; batch < batches; batch++) {
        const questionsInThisBatch = Math.min(batchSize, questionsNeeded - (batch * batchSize));
        
        console.log(`🔄 [${requestId}] Batch ${batch + 1}/${batches}: generating ${questionsInThisBatch} ${difficultyLevel} questions...`);
        
        try {
          const exerciseContent = await generateAdvancedExercise({
            level: level as SpanishLevel,
            topic: topicName,
            topicDescription: topicDescription || '',
            exerciseType: exerciseType as 'multiple_choice' | 'fill_blank' | 'translation' | 'conjugation' | 'sentence_structure',
            questionCount: questionsInThisBatch,
            difficulty: difficultyLevel as 'easy' | 'medium' | 'hard',
            existingQuestions: [], // Simplified - no duplicate checking
            generateVariations: true,
            includeExplanations: true,
            targetProficiency: true
          });

          if (!exerciseContent?.questions || exerciseContent.questions.length === 0) {
            console.warn(`⚠️ [${requestId}] No questions generated for ${difficultyLevel} difficulty, batch ${batch + 1}`);
            continue;
          }

          // Simple validation
          const validQuestions = exerciseContent.questions.filter(q => {
            return q.question_da && q.correct_answer && q.explanation_da;
          });

          if (validQuestions.length > 0) {
            const questionsWithDifficulty = validQuestions.map(q => ({
              ...q,
              difficulty: difficultyLevel
            }));
            
            allQuestionsForDifficulty.push(...questionsWithDifficulty);
            console.log(`✅ [${requestId}] Batch ${batch + 1}: Generated ${validQuestions.length} valid ${difficultyLevel} questions`);
          }
          
        } catch (batchError: any) {
          console.error(`❌ [${requestId}] Batch ${batch + 1} failed for ${difficultyLevel}:`, batchError);
          // Continue with other batches instead of failing completely
        }
      }
      
      if (allQuestionsForDifficulty.length > 0) {
        allGeneratedExercises.push({
          difficulty: difficultyLevel,
          questions: allQuestionsForDifficulty,
          metadata: { requestId, generated_at: new Date().toISOString() }
        });

        totalQuestions += allQuestionsForDifficulty.length;
        totalExercisesGenerated += exerciseCount;
        console.log(`✅ [${requestId}] Generated ${allQuestionsForDifficulty.length} total ${difficultyLevel} questions across all batches`);
      }

    }

    if (allGeneratedExercises.length === 0 || totalQuestions === 0) {
      return NextResponse.json({ 
        error: 'No exercises generated',
        message: 'AI service did not generate any valid exercises'
      }, { status: 500 });
    }

    console.log(`🎉 [${requestId}] Generated ${totalQuestions} total questions`);

    // Save to database - create exactly the requested number of exercises
    console.log(`💾 [${requestId}] Saving to database...`);
    const exercisesToCreate = [];
    let exerciseCounter = 1;
    
    // Distribute questions evenly across the requested number of exercises
    const allQuestions = allGeneratedExercises.flatMap(ex => ex.questions);
    const questionsPerExercise = Math.max(3, Math.ceil(allQuestions.length / actualExerciseCount));
    
    for (let i = 0; i < actualExerciseCount && i * questionsPerExercise < allQuestions.length; i++) {
      const startIndex = i * questionsPerExercise;
      const endIndex = Math.min(startIndex + questionsPerExercise, allQuestions.length);
      const questionsSlice = allQuestions.slice(startIndex, endIndex);
      
      if (questionsSlice.length === 0) break; // No more questions to assign
      
      // Determine predominant difficulty level for this exercise
      const difficultyMap = new Map();
      questionsSlice.forEach(q => {
        const diff = q.difficulty || 'medium';
        difficultyMap.set(diff, (difficultyMap.get(diff) || 0) + 1);
      });
      const predominantDifficulty = Array.from(difficultyMap.entries())
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      
      const exerciseData = {
        topic_id: topicId,
        level: level,
        type: getExerciseTypeFromQuestionType(exerciseType),
        title_da: `${topicName} - ${exerciseType} (${predominantDifficulty.toUpperCase()}) #${exerciseCounter}`,
        title_es: `${topicName} - ${exerciseType} (${predominantDifficulty.toUpperCase()}) #${exerciseCounter}`,
        description_da: `AI-genereret ${predominantDifficulty} øvelse om ${topicName} med ${questionsSlice.length} spørgsmål`,
        description_es: `Ejercicio ${predominantDifficulty} generado por IA sobre ${topicName} con ${questionsSlice.length} preguntas`,
        content: {
          instructions_da: `Besvar følgende spørgsmål om ${topicName}. Sværhedsgrad: ${predominantDifficulty}`,
          questions: questionsSlice,
          metadata: {
            difficulty: predominantDifficulty,
            generated_at: new Date().toISOString(),
            ai_generated: true,
            request_id: requestId,
            exercise_number: exerciseCounter,
            total_exercises: actualExerciseCount
          }
        },
        ai_generated: true,
      };

      exercisesToCreate.push(exerciseData);
      exerciseCounter++;
    }

    // Direct database insert without sophisticated wrappers
    console.log(`💾 [${requestId}] Creating ${exercisesToCreate.length} exercises...`);
    const { data: newExercises, error: insertError } = await supabase
      .from('exercises')
      .insert(exercisesToCreate)
      .select();

    if (insertError) {
      console.error(`❌ [${requestId}] Database save failed:`, insertError);
      return NextResponse.json({ 
        error: 'Database save failed',
        message: `Failed to save exercises: ${insertError.message}`
      }, { status: 500 });
    }

    console.log(`🎉 [${requestId}] Successfully created ${newExercises?.length || 0} exercises`);

    return NextResponse.json({
      success: true,
      requestId,
      exercisesCreated: newExercises?.length || 0,
      exercises: newExercises,
      totalQuestions,
      message: `Successfully generated ${totalQuestions} questions in ${newExercises?.length || 0} exercises`
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Unexpected error:`, error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

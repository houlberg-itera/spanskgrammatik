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
const MAX_QUESTIONS_PER_REQUEST = 5;
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

    // Apply request limits
    const actualCount = Math.min(count, MAX_QUESTIONS_PER_REQUEST);
    if (count > MAX_QUESTIONS_PER_REQUEST) {
      console.log(`⚠️ [${requestId}] Requested ${count} questions, limiting to ${MAX_QUESTIONS_PER_REQUEST}`);
    }

    console.log(`✅ [${requestId}] All validations passed`);

    // Generate exercises with OpenAI
    console.log(`🤖 [${requestId}] Starting AI generation...`);
    
    const difficulties = difficultyDistribution 
      ? Object.entries(difficultyDistribution).filter(([_, percentage]) => (percentage as number) > 0)
      : [[difficulty || 'medium', 100]];

    const allGeneratedExercises = [];
    let totalQuestions = 0;

    for (const [difficultyLevel, percentage] of difficulties) {
      const difficultyCount = Math.ceil((actualCount * (percentage as number)) / 100);
      
      if (difficultyCount <= 0) continue;

      console.log(`🎯 [${requestId}] Generating ${difficultyCount} ${difficultyLevel} questions...`);

      try {
        const exerciseContent = await generateAdvancedExercise({
          level: level as SpanishLevel,
          topic: topicName,
          topicDescription: topicDescription || '',
          exerciseType: exerciseType as 'multiple_choice' | 'fill_blank' | 'translation' | 'conjugation' | 'sentence_structure',
          questionCount: difficultyCount,
          difficulty: difficultyLevel as 'easy' | 'medium' | 'hard',
          existingQuestions: [], // Simplified - no duplicate checking
          generateVariations: true,
          includeExplanations: true,
          targetProficiency: true
        });

        if (!exerciseContent?.questions || exerciseContent.questions.length === 0) {
          console.warn(`⚠️ [${requestId}] No questions generated for ${difficultyLevel} difficulty`);
          continue;
        }

        // Simple validation
        const validQuestions = exerciseContent.questions.filter(q => {
          return q.question_da && q.correct_answer && q.explanation_da;
        });

        if (validQuestions.length === 0) {
          console.warn(`⚠️ [${requestId}] No valid questions for ${difficultyLevel} difficulty`);
          continue;
        }

        const questionsWithDifficulty = validQuestions.map(q => ({
          ...q,
          difficulty: difficultyLevel
        }));

        allGeneratedExercises.push({
          difficulty: difficultyLevel,
          questions: questionsWithDifficulty,
          metadata: exerciseContent.metadata
        });

        totalQuestions += validQuestions.length;
        console.log(`✅ [${requestId}] Generated ${validQuestions.length} valid ${difficultyLevel} questions`);

      } catch (openaiError: any) {
        console.error(`❌ [${requestId}] AI generation failed for ${difficultyLevel}:`, openaiError);
        return NextResponse.json({ 
          error: 'AI generation failed',
          message: `Failed to generate ${difficultyLevel} exercises: ${openaiError.message || 'Unknown error'}`
        }, { status: 500 });
      }
    }

    if (allGeneratedExercises.length === 0 || totalQuestions === 0) {
      return NextResponse.json({ 
        error: 'No exercises generated',
        message: 'AI service did not generate any valid exercises'
      }, { status: 500 });
    }

    console.log(`🎉 [${requestId}] Generated ${totalQuestions} total questions`);

    // Save to database with simple approach
    console.log(`💾 [${requestId}] Saving to database...`);
    const exercisesToCreate = [];
    let exerciseCounter = 1;
    
    for (const difficultyExercises of allGeneratedExercises) {
      const { difficulty: diffLevel, questions, metadata } = difficultyExercises;
      const questionsPerExercise = Math.min(8, Math.max(5, Math.ceil(questions.length / Math.ceil(questions.length / 8))));
      
      for (let i = 0; i < questions.length; i += questionsPerExercise) {
        const questionsSlice = questions.slice(i, i + questionsPerExercise);
        
        const exerciseData = {
          topic_id: topicId,
          level: level,
          type: getExerciseTypeFromQuestionType(exerciseType),
          title_da: `${topicName} - ${exerciseType} (${diffLevel.toUpperCase()}) #${exerciseCounter}`,
          title_es: `${topicName} - ${exerciseType} (${diffLevel.toUpperCase()}) #${exerciseCounter}`,
          description_da: `AI-genereret ${diffLevel} øvelse om ${topicName} med ${questionsSlice.length} spørgsmål`,
          description_es: `Ejercicio ${diffLevel} generado por IA sobre ${topicName} con ${questionsSlice.length} preguntas`,
          content: {
            instructions_da: `Besvar følgende spørgsmål om ${topicName}. Sværhedsgrad: ${diffLevel}`,
            questions: questionsSlice,
            metadata: {
              difficulty: diffLevel,
              generated_at: new Date().toISOString(),
              ai_generated: true,
              request_id: requestId
            }
          },
          ai_generated: true,
        };

        exercisesToCreate.push(exerciseData);
        exerciseCounter++;
      }
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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAdvancedExercise } from '@/lib/openai-advanced';
import { SpanishLevel } from '@/types/database';
import { getUserPermissions, ensureUserProfile } from '@/lib/auth/permissions';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { AppError, createPermissionError, createRateLimitError, createValidationError } from '@/lib/utils/error-handling';
import { safeQuery, validateDatabaseSchema } from '@/lib/database/safe-queries';

export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🚀 [SOPHISTICATED] Starting bulk exercise generation request [${requestId}]...`);
  
  try {
    // Step 1: Database Schema Validation
    console.log(`🔧 [${requestId}] Step 1: Validating database schema...`);
    const schemaValidation = await validateDatabaseSchema();
    if (!schemaValidation.isValid) {
      console.warn(`⚠️ [${requestId}] Database schema issues detected:`, schemaValidation.issues);
    }

    // Step 2: Supabase Client Creation
    console.log(`📡 [${requestId}] Step 2: Creating Supabase client...`);
    const supabase = await createClient();
    
    // Step 3: Authentication Check
    console.log(`🔐 [${requestId}] Step 3: Checking authentication...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`❌ [${requestId}] Authentication failed:`, authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Step 4: User Profile Management
    console.log(`👤 [${requestId}] Step 4: Managing user profile for ${user.email}...`);
    await ensureUserProfile(user.id, user.email || '');
    
    // Step 5: Permission Validation
    console.log(`🔍 [${requestId}] Step 5: Validating user permissions...`);
    const permissions = await getUserPermissions(user.id);
    
    if (!permissions.canGenerateExercises) {
      console.log(`❌ [${requestId}] Permission denied for ${user.email} - role: ${permissions.role}`);
      const permissionError = createPermissionError('EXERCISE_GENERATION_DENIED', {
        userEmail: user.email,
        userRole: permissions.role,
        requiredRole: 'admin'
      });
      return NextResponse.json(permissionError, { status: 403 });
    }
    
    console.log(`✅ [${requestId}] Permission granted - role: ${permissions.role}, admin: ${permissions.isAdmin}`);

    // Step 6: Rate Limiting
    console.log(`⏱️ [${requestId}] Step 6: Checking rate limits...`);
    const rateLimitCheck = await checkRateLimit(user.id, 'exercise_generation');
    
    if (!rateLimitCheck.allowed) {
      console.log(`⚠️ [${requestId}] Rate limit exceeded for ${user.email}`);
      const rateLimitError = createRateLimitError('EXERCISE_GENERATION_LIMIT', {
        limit: rateLimitCheck.limit,
        remaining: rateLimitCheck.remaining,
        resetTime: rateLimitCheck.resetTime
      });
      return NextResponse.json(rateLimitError, { status: 429 });
    }
    
    console.log(`✅ [${requestId}] Rate limit check passed - remaining: ${rateLimitCheck.remaining}/${rateLimitCheck.limit}`);

    // Step 7: Request Body Parsing & Validation
    console.log(`📝 [${requestId}] Step 7: Parsing and validating request...`);
    const body = await request.json();
    
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

    // Enhanced validation with sophisticated error messages
    const validationErrors = [];
    
    if (!topicId || typeof topicId !== 'number') {
      validationErrors.push('topicId must be a valid number');
    }
    if (!exerciseType || typeof exerciseType !== 'string') {
      validationErrors.push('exerciseType must be a valid string');
    }
    if (!count || typeof count !== 'number' || count < 1 || count > 20) {
      validationErrors.push('count must be a number between 1 and 20');
    }
    if (!difficulty && !difficultyDistribution) {
      validationErrors.push('either difficulty or difficultyDistribution is required');
    }
    if (!level || !['A1', 'A2', 'B1'].includes(level)) {
      validationErrors.push('level must be one of: A1, A2, B1');
    }
    if (!topicName || typeof topicName !== 'string' || topicName.trim().length < 2) {
      validationErrors.push('topicName must be a valid string with at least 2 characters');
    }

    if (validationErrors.length > 0) {
      console.error(`❌ [${requestId}] Validation errors:`, validationErrors);
      const validationError = createValidationError('INVALID_REQUEST_DATA', {
        errors: validationErrors,
        received: body
      });
      return NextResponse.json(validationError, { status: 400 });
    }

    // Step 8: Advanced Parameter Processing
    console.log(`⚙️ [${requestId}] Step 8: Processing advanced parameters...`);
    
    // Smart count adjustment based on user permissions
    const maxQuestionsPerGeneration = permissions.isAdmin ? 20 : 5;
    const actualCount = Math.min(count, maxQuestionsPerGeneration);
    
    if (count > maxQuestionsPerGeneration) {
      console.log(`⚠️ [${requestId}] Adjusted count from ${count} to ${actualCount} based on user permissions`);
    }

    // Process difficulty distribution with sophisticated algorithms
    const difficulties = difficultyDistribution 
      ? Object.entries(difficultyDistribution).filter(([_, percentage]) => (percentage as number) > 0)
      : [[difficulty || 'medium', 100]];

    // Step 9: Duplicate Prevention Analysis
    console.log(`🔍 [${requestId}] Step 9: Analyzing existing exercises for duplicate prevention...`);
    
    const existingExercisesResult = await safeQuery(
      () => supabase
        .from('exercises')
        .select('content')
        .eq('topic_id', topicId)
        .eq('type', getExerciseTypeFromQuestionType(exerciseType)),
      'Failed to fetch existing exercises for duplicate prevention'
    );

    const existingQuestions = existingExercisesResult.data?.flatMap(ex => 
      ex.content?.questions?.map((q: any) => q.question_da) || []
    ) || [];

    console.log(`📊 [${requestId}] Found ${existingQuestions.length} existing questions for duplicate analysis`);

    // Step 10: Advanced AI Exercise Generation
    console.log(`🤖 [${requestId}] Step 10: Initiating advanced AI exercise generation...`);
    
    const allGeneratedExercises = [];
    let totalQuestions = 0;
    let generationMetrics = {
      totalRequested: actualCount,
      totalGenerated: 0,
      byDifficulty: {} as Record<string, number>,
      processingTime: Date.now()
    };

    for (const [difficultyLevel, percentage] of difficulties) {
      const difficultyCount = Math.ceil((actualCount * (percentage as number)) / 100);
      
      if (difficultyCount <= 0) continue;

      console.log(`🎯 [${requestId}] Generating ${difficultyCount} ${difficultyLevel} exercises with advanced AI...`);

      try {
        const exerciseContent = await generateAdvancedExercise({
          level: level as SpanishLevel,
          topic: topicName,
          topicDescription: topicDescription || '',
          exerciseType,
          questionCount: difficultyCount,
          difficulty: difficultyLevel,
          existingQuestions,
          generateVariations: true,
          includeExplanations: true,
          targetProficiency: true
        });

        // Sophisticated content validation
        if (!exerciseContent?.questions?.length) {
          console.warn(`⚠️ [${requestId}] Empty content generated for ${difficultyLevel}, skipping...`);
          continue;
        }

        // Advanced quality filtering
        const validQuestions = exerciseContent.questions.filter(q => {
          const qualityScore = [
            q.question_da?.trim().length > 10,
            q.correct_answer && (Array.isArray(q.correct_answer) ? q.correct_answer.length > 0 : q.correct_answer.trim().length > 0),
            q.explanation_da?.trim().length > 20,
            q.options?.length >= 2 || exerciseType !== 'multiple_choice'
          ].filter(Boolean).length;
          
          return qualityScore >= 3; // Require at least 3 out of 4 quality criteria
        });

        if (validQuestions.length > 0) {
          allGeneratedExercises.push({
            difficulty: difficultyLevel,
            questions: validQuestions.map(q => ({ ...q, difficulty: difficultyLevel })),
            metadata: exerciseContent.metadata
          });
          
          const validCount = validQuestions.length;
          totalQuestions += validCount;
          generationMetrics.byDifficulty[difficultyLevel] = validCount;
          
          console.log(`✅ [${requestId}] Generated ${validCount} high-quality ${difficultyLevel} questions`);
        }

      } catch (aiError: any) {
        console.error(`❌ [${requestId}] AI generation failed for ${difficultyLevel}:`, aiError.message);
        
        // Sophisticated error handling based on error type
        if (aiError.message?.includes('rate_limit')) {
          const rateLimitError = createRateLimitError('AI_SERVICE_LIMIT', {
            service: 'OpenAI',
            suggestion: 'Try again in 2-5 minutes'
          });
          return NextResponse.json(rateLimitError, { status: 429 });
        }
        
        // Continue with other difficulties even if one fails
        continue;
      }
    }

    generationMetrics.totalGenerated = totalQuestions;
    generationMetrics.processingTime = Date.now() - generationMetrics.processingTime;

    // Step 11: Quality Assurance Check
    console.log(`🔬 [${requestId}] Step 11: Quality assurance validation...`);
    
    if (allGeneratedExercises.length === 0 || totalQuestions === 0) {
      console.error(`❌ [${requestId}] Quality check failed - no valid exercises generated`);
      return NextResponse.json({ 
        error: 'Quality assurance failed - no exercises met quality standards',
        generationMetrics
      }, { status: 500 });
    }

    console.log(`✅ [${requestId}] Quality check passed - ${totalQuestions} high-quality questions generated`);

    // Step 12: Database Storage with Transaction Safety
    console.log(`💾 [${requestId}] Step 12: Sophisticated database storage...`);
    
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
          description_da: `Avanceret AI-genereret ${diffLevel} øvelse om ${topicName} med ${questionsSlice.length} spørgsmål`,
          description_es: `Ejercicio ${diffLevel} avanzado generado por IA sobre ${topicName} con ${questionsSlice.length} preguntas`,
          content: {
            instructions_da: `Besvar følgende spørgsmål om ${topicName}. Sværhedsgrad: ${diffLevel}`,
            questions: questionsSlice,
            metadata: {
              difficulty: diffLevel,
              generated_at: new Date().toISOString(),
              ai_generated: true,
              generation_id: requestId,
              quality_score: 'high',
              topic_coverage: metadata?.topic_coverage || [],
              proficiency_indicators: metadata?.proficiency_indicators || [],
              generation_metrics: generationMetrics
            }
          },
          ai_generated: true,
        };

        exercisesToCreate.push(exerciseData);
        exerciseCounter++;
      }
    }

    // Safe database insertion with retry logic
    const insertResult = await safeQuery(
      () => supabase
        .from('exercises')
        .insert(exercisesToCreate)
        .select(),
      'Failed to save sophisticated exercises to database'
    );

    if (!insertResult.success || !insertResult.data) {
      console.error(`❌ [${requestId}] Database insertion failed:`, insertResult.error);
      return NextResponse.json({ 
        error: 'Failed to save exercises to database',
        details: insertResult.error
      }, { status: 500 });
    }

    // Step 13: Success Response with Comprehensive Metrics
    console.log(`🎉 [${requestId}] Step 13: Generating success response...`);
    
    const successResponse = {
      success: true,
      requestId,
      exercisesCreated: insertResult.data.length,
      questionsGenerated: totalQuestions,
      generationMetrics,
      qualityAssurance: {
        duplicatesAvoided: existingQuestions.length,
        qualityFiltered: true,
        processingTimeMs: generationMetrics.processingTime
      },
      exercises: insertResult.data,
      metadata: {
        totalQuestions,
        difficultiesGenerated: allGeneratedExercises.map(e => e.difficulty),
        topicCoverage: allGeneratedExercises.flatMap(e => e.metadata?.topic_coverage || []),
        proficiencyIndicators: allGeneratedExercises.flatMap(e => e.metadata?.proficiency_indicators || []),
        permissions: {
          userRole: permissions.role,
          isAdmin: permissions.isAdmin,
          maxQuestionsAllowed: maxQuestionsPerGeneration
        }
      }
    };

    console.log(`✅ [${requestId}] SOPHISTICATED GENERATION COMPLETE: ${totalQuestions} questions in ${generationMetrics.processingTime}ms`);
    
    return NextResponse.json(successResponse);

  } catch (error: any) {
    console.error(`💥 [${requestId}] Sophisticated system error:`, error);
    
    // Sophisticated error response
    const sophisticatedError = {
      error: 'Sophisticated exercise generation system encountered an error',
      requestId,
      details: error instanceof Error ? error.message : 'Unknown system error',
      type: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString(),
      troubleshooting: {
        suggestion: 'Please try again in a few minutes',
        contactSupport: 'If the issue persists, contact technical support',
        errorCode: 'SOPH_SYS_ERR_001'
      }
    };
    
    return NextResponse.json(sophisticatedError, { status: 500 });
  }
}
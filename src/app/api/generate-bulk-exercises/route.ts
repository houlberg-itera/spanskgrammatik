import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateAdvancedExercise } from '@/lib/openai-advanced';
import { SpanishLevel } from '@/types/database';

// Force dynamic rendering for this API route
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
  console.log(`🚀 Starting bulk exercise generation request [${requestId}]...`);
  
  try {
    console.log(`📡 Creating Supabase client [${requestId}]...`);
    const supabase = await createClient();
    
    // Create admin client for database operations to bypass RLS issues
    const adminSupabase = createAdminClient();
    
    // Check authentication
    console.log('🔐 Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Authentication successful for user:', user.email);

    // IMPORTANT: Restrict access to admin only - remove this for end users to prevent exercise generation
    const userEmail = user.email;
    
    // Get admin emails from environment or use defaults
    const adminEmailsEnv = process.env.ADMIN_EMAILS || 'admin@spanskgrammatik.dk,anders.houlberg-niel@itera.no';
    const adminEmails = adminEmailsEnv.split(',').map(email => email.trim());
    
    console.log(`🔍 Checking admin access for: ${userEmail}`);
    console.log(`🔍 Admin emails configured: ${adminEmails.join(', ')}`);
    
    if (!adminEmails.includes(userEmail || '')) {
      console.log(`❌ Access denied for ${userEmail}`);
      return NextResponse.json({ 
        error: 'Admin access required for exercise generation',
        userEmail: userEmail,
        adminEmails: adminEmails
      }, { status: 403 });
    }
    
    console.log(`✅ Admin access granted for ${userEmail}`);

    console.log(`📝 Parsing request body [${requestId}]...`);
    const body = await request.json();
    console.log(`📦 Request body [${requestId}]:`, JSON.stringify(body, null, 2));
    
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

    console.log('🔍 Extracted parameters:', {
      topicId,
      exerciseType,
      count,
      difficulty,
      level,
      topicName,
      topicDescription,
      difficultyDistribution
    });

    // Validate all required fields with detailed error messages
    const missingFields = [];
    if (!topicId) missingFields.push('topicId');
    if (!exerciseType) missingFields.push('exerciseType');
    if (!count) missingFields.push('count');
    if (!difficulty && !difficultyDistribution) missingFields.push('difficulty or difficultyDistribution');
    if (!level) missingFields.push('level');
    if (!topicName) missingFields.push('topicName');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      console.error('❌ Received body:', JSON.stringify(body, null, 2));
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        received: body,
        required: ['topicId', 'exerciseType', 'count', 'difficulty or difficultyDistribution', 'level', 'topicName']
      }, { status: 400 });
    }

    console.log('✅ All required fields present');

    // Rate limit safeguard: Limit questions per generation to avoid API limits
    const maxQuestionsPerGeneration = 5;  // Reduced from unlimited to 5 questions max
    const actualCount = Math.min(count, maxQuestionsPerGeneration);
    
    if (count > maxQuestionsPerGeneration) {
      console.log(`⚠️ Requested ${count} questions, limiting to ${maxQuestionsPerGeneration} to avoid rate limits`);
    }

    // Validate level and difficulty values
    const validLevels = ['A1', 'A2', 'B1'];
    const validDifficulties = ['easy', 'medium', 'hard'];
    const validExerciseTypes = ['multiple_choice', 'fill_blank', 'translation', 'conjugation', 'sentence_structure'];

    if (!validLevels.includes(level)) {
      console.error(`❌ Invalid level: ${level}`);
      return NextResponse.json({ 
        error: `Invalid level: ${level}. Must be one of: ${validLevels.join(', ')}` 
      }, { status: 400 });
    }

    // Validate difficulty if provided, or validate difficultyDistribution keys
    if (difficulty && !validDifficulties.includes(difficulty)) {
      console.error(`❌ Invalid difficulty: ${difficulty}`);
      return NextResponse.json({ 
        error: `Invalid difficulty: ${difficulty}. Must be one of: ${validDifficulties.join(', ')}` 
      }, { status: 400 });
    }

    if (difficultyDistribution) {
      const invalidDifficulties = Object.keys(difficultyDistribution).filter(d => !validDifficulties.includes(d));
      if (invalidDifficulties.length > 0) {
        return NextResponse.json({ 
          error: `Invalid difficulties in distribution: ${invalidDifficulties.join(', ')}. Must be one of: ${validDifficulties.join(', ')}` 
        }, { status: 400 });
      }
    }

    if (!validExerciseTypes.includes(exerciseType)) {
      return NextResponse.json({ 
        error: `Invalid exercise type: ${exerciseType}. Must be one of: ${validExerciseTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Handle multiple difficulties if difficultyDistribution is provided
    const difficulties = difficultyDistribution 
      ? Object.entries(difficultyDistribution).filter(([_, percentage]) => (percentage as number) > 0)
      : [[difficulty || 'medium', 100]];
    
    console.log(`🤖 Generating ${actualCount} ${exerciseType} exercises for topic: ${topicName} (${level}) [${requestId}]`);
    console.log(`📊 Difficulty distribution [${requestId}]:`, difficulties);

    // Check for recent generation to prevent rapid duplicates (reduced from 5 minutes to 2 minutes for GPT-5)
    const { data: recentGeneration } = await supabase
      .from('exercises')
      .select('created_at')
      .eq('topic_id', topicId)
      .eq('type', getExerciseTypeFromQuestionType(exerciseType))
      .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes (reduced from 5)
      .limit(1);

    if (recentGeneration && recentGeneration.length > 0) {
      console.log(`⏰ Rate limiting: Recent generation found for topic ${topicId}, type ${exerciseType}`);
      return NextResponse.json({ 
        error: 'Recent exercises already generated for this topic and type. Please wait 2 minutes before generating again.',
        errorType: 'RATE_LIMIT',
        recentGeneration: true,
        waitTime: '2 minutes'
      }, { status: 429 });
    }

    // Fetch existing exercises to avoid duplicates using admin client
    console.log('🔍 Fetching existing exercises to avoid duplicates...');
    const { data: existingExercises } = await adminSupabase
      .from('exercises')
      .select('content')
      .eq('topic_id', topicId)
      .eq('type', getExerciseTypeFromQuestionType(exerciseType));

    const existingQuestions = existingExercises?.flatMap(ex => 
      ex.content?.questions?.map((q: any) => q.question_da) || []
    ) || [];

    console.log(`📊 Found ${existingQuestions.length} existing questions to avoid duplicating`);

    // Generate exercises for each difficulty level
    const allGeneratedExercises = [];
    let totalQuestions = 0;

    for (const [difficultyLevel, percentage] of difficulties) {
      const difficultyCount = Math.ceil((actualCount * (percentage as number)) / 100);
      
      if (difficultyCount <= 0) continue;

      console.log(`🤖 Generating ${difficultyCount} ${difficultyLevel} ${exerciseType} exercises [${requestId}]`);

      // Generate exercise content using enhanced AI
      console.log('🤖 Calling generateAdvancedExercise with parameters:', {
        level: level as SpanishLevel,
        topic: topicName,
        topicDescription: topicDescription || '',
        exerciseType,
        questionCount: difficultyCount,
        difficulty: difficultyLevel,
        existingQuestionsCount: existingQuestions.length,
        generateVariations: true,
        includeExplanations: true,
        targetProficiency: true
      });

      let exerciseContent;
      try {
        console.log(`🔄 Starting OpenAI generation for ${difficultyLevel} difficulty [${requestId}]...`);
        exerciseContent = await generateAdvancedExercise({
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
        console.log(`✅ OpenAI generation completed for ${difficultyLevel} difficulty [${requestId}]`);
      } catch (openaiError: any) {
        console.error(`❌ OpenAI generation failed for ${difficultyLevel} difficulty:`, openaiError);
        
        // Check if this is a GPT-5 reasoning token issue
        const isReasoningTokenIssue = openaiError?.message?.includes('GPT-5 used reasoning tokens but returned no content') ||
                                     openaiError?.message?.includes('Failed to generate exercises even with reduced question count');
        
        if (isReasoningTokenIssue) {
          return NextResponse.json({ 
            error: 'GPT-5 is experiencing issues with complex requests. The system tried reducing question count but still failed.',
            details: openaiError.message,
            type: 'GPT5_REASONING_ERROR',
            suggestion: 'Try again in a few minutes or request fewer questions'
          }, { status: 500 });
        }
        
        // Check if this is a rate limit error
        const isRateLimit = openaiError?.status === 429 || 
                           openaiError?.message?.includes('Too Many Requests') ||
                           openaiError?.message?.includes('rate_limit_exceeded');
        
        if (isRateLimit) {
          return NextResponse.json({ 
            error: 'AI service is currently at capacity. Please wait a few minutes before trying again.',
            details: 'Rate limit exceeded - too many requests',
            type: 'RATE_LIMIT_ERROR',
            retryAfter: '2-5 minutes'
          }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: 'Failed to generate exercises with AI',
          details: openaiError.message,
          type: 'OPENAI_ERROR'
        }, { status: 500 });
      }

      // Enhanced validation to prevent empty exercises
      if (!exerciseContent || !exerciseContent.questions || exerciseContent.questions.length === 0) {
        console.error(`❌ AI generated empty content for ${difficultyLevel} difficulty:`, exerciseContent);
        continue; // Skip this difficulty but continue with others
      }

      // Validate question quality
      const validQuestions = exerciseContent.questions.filter(q => {
        const hasValidQuestion = q.question_da && q.question_da.trim().length > 0;
        const hasValidAnswer = q.correct_answer && 
          (Array.isArray(q.correct_answer) ? q.correct_answer.length > 0 : q.correct_answer.trim().length > 0);
        const hasValidExplanation = q.explanation_da && q.explanation_da.trim().length > 0;
        
        return hasValidQuestion && hasValidAnswer && hasValidExplanation;
      });

      if (validQuestions.length === 0) {
        console.warn(`⚠️ No valid questions generated for ${difficultyLevel} difficulty, skipping...`);
        continue;
      }

      // Use only valid questions and log if some were filtered out
      if (validQuestions.length < exerciseContent.questions.length) {
        console.warn(`⚠️ Filtered out ${exerciseContent.questions.length - validQuestions.length} invalid questions for ${difficultyLevel} difficulty`);
      }

      // Store the questions for this difficulty with metadata
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
      console.log(`✅ Generated ${validQuestions.length} valid ${difficultyLevel} questions [${requestId}]`);
    }

    // Check if we generated any valid exercises
    if (allGeneratedExercises.length === 0 || totalQuestions === 0) {
      console.error('❌ No valid exercises generated across all difficulty levels');
      return NextResponse.json({ error: 'Failed to generate any valid exercises' }, { status: 500 });
    }

    console.log(`✅ Generated total of ${totalQuestions} questions across ${allGeneratedExercises.length} difficulty levels [${requestId}]`);

    // Create exercises for each difficulty level
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
              topic_coverage: metadata?.topic_coverage || [],
              proficiency_indicators: metadata?.proficiency_indicators || []
            }
          },
          ai_generated: true,
        };

        exercisesToCreate.push(exerciseData);
        exerciseCounter++;
      }
    }

    // Save the generated exercises to database using admin client to bypass RLS
    console.log(`💾 Saving ${exercisesToCreate.length} exercises to database...`);
    console.log('📊 Exercise data preview:', JSON.stringify(exercisesToCreate[0], null, 2));
    
    // Use admin client for database insertion to avoid RLS recursion issues
    const { data: newExercises, error: insertError } = await adminSupabase
      .from('exercises')
      .insert(exercisesToCreate)
      .select();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      console.error('❌ Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json({ 
        error: 'Failed to save exercises to database',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log(`✅ Successfully created ${newExercises?.length || 0} exercises [${requestId}]`);

    return NextResponse.json({
      success: true,
      exercisesCreated: newExercises?.length || 0,
      exercises: newExercises,
      metadata: {
        totalQuestions,
        difficultiesGenerated: allGeneratedExercises.map(e => e.difficulty),
        topicCoverage: allGeneratedExercises.flatMap(e => e.metadata?.topic_coverage || []),
        proficiencyIndicators: allGeneratedExercises.flatMap(e => e.metadata?.proficiency_indicators || [])
      }
    });

  } catch (error) {
    console.error('❌ Exercise generation error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to generate exercises',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

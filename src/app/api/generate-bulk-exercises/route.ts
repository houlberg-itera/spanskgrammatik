import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateAdvancedExercise } from '@/lib/openai-advanced';
import { getAIConfigurationWithDefaults } from '@/lib/ai-config';
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
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🚀 Starting bulk exercise generation request [${requestId}] at ${new Date().toISOString()}...`);
  
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
        error: `Admin access required. Your email (${userEmail}) is not in the admin list.`,
        userEmail: userEmail,
        adminEmails: adminEmails,
        message: 'Please add your email to the ADMIN_EMAILS environment variable to access exercise generation.'
      }, { status: 403 });
    }
    
    console.log(`✅ Admin access granted for ${userEmail}`);

    // Fetch AI configuration specifically for bulk generation
    console.log('🔍 Fetching bulk_generation AI configuration...');
    const aiConfig = await getAIConfigurationWithDefaults('bulk_generation');
    console.log(`✅ Using AI configuration: ${aiConfig.configName} -> ${aiConfig.model} (temp: ${aiConfig.temperature}, max_tokens: ${aiConfig.maxTokens})`);
    
    if (!aiConfig.configFound) {
      console.log(`⚠️ No database configuration found for 'bulk_generation', using defaults`);
    }

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
      difficultyDistribution,
      model
    } = body;

    console.log('🔍 Extracted parameters:', {
      topicId,
      exerciseType,
      count,
      difficulty,
      level,
      topicName,
      topicDescription,
      difficultyDistribution,
      model
    });

    // Validate all required fields with detailed error messages
    const missingFields = [];
    if (!topicId) missingFields.push('topicId');
    if (!exerciseType) missingFields.push('exerciseType');
    if (!count) missingFields.push('count');
    if (!difficulty && !difficultyDistribution) missingFields.push('difficulty or difficultyDistribution');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      console.error('❌ Received body:', JSON.stringify(body, null, 2));
      return NextResponse.json({ 
        error: `Missing required fields: ${JSON.stringify(missingFields)}`,
        receivedBody: body,
        requiredFields: ['topicId', 'exerciseType', 'count', 'difficulty or difficultyDistribution']
      }, { status: 400 });
    }

    // Fetch topic details from database if not provided
    let finalLevel = level;
    let finalTopicName = topicName;
    let finalTopicDescription = topicDescription;

    if (!level || !topicName) {
      console.log(`🔍 Fetching topic details for ID: ${topicId}`);
      const { data: topic, error: topicError } = await adminSupabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (topicError || !topic) {
        console.error('❌ Topic not found:', topicError);
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }

      finalLevel = level || topic.level;
      finalTopicName = topicName || topic.name_da;
      finalTopicDescription = topicDescription || topic.description_da;
      
      console.log(`✅ Topic details fetched:`, {
        level: finalLevel,
        name: finalTopicName,
        description: finalTopicDescription
      });
    }

    console.log('✅ All required fields present');

    // Convert exercises count to questions count
    // Each exercise should have approximately 5 questions, so calculate total questions needed
    const questionsPerExerciseTarget = 5;
    const totalQuestionsNeeded = count * questionsPerExerciseTarget;
    
    // Rate limit safeguard: Allow up to 15 questions per generation (for up to 3 exercises)
    // This prevents OpenAI content policy refusals from large requests
    const maxQuestionsPerGeneration = 15;
    const actualQuestionsToGenerate = Math.min(totalQuestionsNeeded, maxQuestionsPerGeneration);
    const maxExercisesCanCreate = Math.floor(actualQuestionsToGenerate / questionsPerExerciseTarget);
    
    if (totalQuestionsNeeded > maxQuestionsPerGeneration) {
      console.log(`⚠️ Requested ${count} exercises (${totalQuestionsNeeded} questions), limiting to ${maxExercisesCanCreate} exercises (${actualQuestionsToGenerate} questions) to avoid OpenAI content policy issues`);
    } else {
      console.log(`📝 Generating ${actualQuestionsToGenerate} questions for ${count} requested exercises`);
    }

    // Validate level and difficulty values
    const validLevels = ['A1', 'A2', 'B1'];
    const validDifficulties = ['easy', 'medium', 'hard'];
    const validExerciseTypes = ['multiple_choice', 'fill_blank', 'translation', 'conjugation', 'sentence_structure'];

    if (!validLevels.includes(finalLevel)) {
      console.error(`❌ Invalid level: ${finalLevel}`);
      return NextResponse.json({ 
        error: `Invalid level: ${finalLevel}. Must be one of: ${validLevels.join(', ')}` 
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
    
    console.log(`🤖 Generating ${actualQuestionsToGenerate} questions for ${count} ${exerciseType} exercises for topic: ${finalTopicName} (${finalLevel}) [${requestId}]`);
    console.log(`📊 Difficulty distribution [${requestId}]:`, difficulties);
    console.log(`🎯 Target exercise type mapping: ${exerciseType} → ${getExerciseTypeFromQuestionType(exerciseType)}`);
    console.log(`🔢 Rate limit check window: Last 2 minutes`);

    // Check for recent generation to prevent rapid duplicates (reduced from 5 minutes to 2 minutes for GPT-5)
    console.log(`⏰ Checking for recent generations in topic ${topicId}, type ${getExerciseTypeFromQuestionType(exerciseType)}...`);
    const { data: recentGeneration } = await supabase
      .from('exercises')
      .select('created_at')
      .eq('topic_id', topicId)
      .eq('type', getExerciseTypeFromQuestionType(exerciseType))
      .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes (reduced from 5)
      .limit(1);

    if (recentGeneration && recentGeneration.length > 0) {
      const lastGeneration = new Date(recentGeneration[0].created_at);
      const timeSinceLastGeneration = Math.round((Date.now() - lastGeneration.getTime()) / 1000);
      console.log(`⏰ Rate limiting: Recent generation found for topic ${topicId}, type ${exerciseType}`);
      console.log(`🕐 Last generation was ${timeSinceLastGeneration} seconds ago (${lastGeneration.toISOString()})`);
      console.log(`⏳ User must wait ${120 - timeSinceLastGeneration} more seconds`);
      
      return NextResponse.json({ 
        error: 'Recent exercises already generated for this topic and type. Please wait 2 minutes before generating again.',
        errorType: 'RATE_LIMIT',
        recentGeneration: true,
        waitTime: '2 minutes',
        timeSinceLastGeneration: timeSinceLastGeneration,
        timeRemaining: Math.max(0, 120 - timeSinceLastGeneration)
      }, { status: 429 });
    }

    console.log(`✅ No recent generation found - proceeding with exercise creation`);

    // Fetch existing exercises to avoid duplicates using admin client
    console.log('🔍 Fetching existing exercises to avoid duplicates...');
    const { data: existingExercises, error: existingError } = await adminSupabase
      .from('exercises')
      .select('content, created_at')
      .eq('topic_id', topicId)
      .eq('type', getExerciseTypeFromQuestionType(exerciseType));

    if (existingError) {
      console.error('❌ Error fetching existing exercises:', existingError);
    }

    const existingQuestions = [];
    if (existingExercises && existingExercises.length > 0) {
      for (const exercise of existingExercises) {
        if (exercise.content && exercise.content.questions) {
          for (const question of exercise.content.questions) {
            if (question && question.question_da) {
              existingQuestions.push(question.question_da);
            }
          }
        }
      }
    }

    console.log(`📊 Found ${existingExercises?.length || 0} existing exercises with ${existingQuestions.length} total questions to avoid duplicating`);
    if (existingQuestions.length > 0) {
      console.log(`📋 Existing question previews:`, existingQuestions.slice(0, 3).map(q => q?.substring(0, 50) + '...'));
    } else {
      console.log(`📋 No existing questions found - fresh topic generation`);
    }

    // Generate exercises for each difficulty level
    const allGeneratedExercises = [];
    let totalQuestions = 0;

    for (const [difficultyLevel, percentage] of difficulties) {
      const difficultyCount = Math.ceil((actualQuestionsToGenerate * (percentage as number)) / 100);
      
      if (difficultyCount <= 0) continue;

      console.log(`🤖 Generating ${difficultyCount} ${difficultyLevel} ${exerciseType} exercises [${requestId}]`);
      console.log(`⏰ Generation start time: ${new Date().toISOString()}`);

      // Generate exercise content using enhanced AI
      console.log('🤖 Calling generateAdvancedExercise with parameters:', {
        level: finalLevel as SpanishLevel,
        topic: finalTopicName,
        topicDescription: finalTopicDescription || '',
        exerciseType,
        questionCount: difficultyCount,
        difficulty: difficultyLevel,
        existingQuestionsCount: existingQuestions.length,
        generateVariations: true,
        includeExplanations: true,
        targetProficiency: true,
        modelUsed: model || aiConfig.model
      });

      let exerciseContent;
      const generationStartTime = Date.now();
      try {
        console.log(`🔄 Starting OpenAI API call for ${difficultyLevel} difficulty [${requestId}]...`);
        console.log(`🎯 AI Model: ${model || aiConfig.model} | Configuration: ${aiConfig.configName} | Temperature: ${aiConfig.temperature} | Max Tokens: ${aiConfig.maxTokens}`);
        
        exerciseContent = await generateAdvancedExercise({
          level: finalLevel as SpanishLevel,
          topic: finalTopicName,
          topicDescription: finalTopicDescription || '',
          exerciseType,
          questionCount: difficultyCount,
          difficulty: difficultyLevel,
          existingQuestions,
          generateVariations: true,
          includeExplanations: true,
          targetProficiency: true,
          model: model || aiConfig.model // Use user-selected model or fall back to configured model
        });
        
        const generationTime = Date.now() - generationStartTime;
        console.log(`✅ OpenAI generation completed for ${difficultyLevel} difficulty [${requestId}]`);
        console.log(`⏱️ Generation took: ${generationTime}ms (${(generationTime/1000).toFixed(1)}s)`);
        console.log(`📊 Generated content preview:`, {
          questionsCount: exerciseContent?.questions?.length || 0,
          hasTitle: !!exerciseContent?.title,
          hasMetadata: !!exerciseContent?.metadata
        });
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
        
        // Check if this is a content policy refusal
        const isContentPolicyRefusal = openaiError?.message?.includes('AI_CONTENT_POLICY_REFUSAL') ||
                                      openaiError?.message?.includes('I\'m sorry') ||
                                      openaiError?.message?.includes('cannot generate');
        
        if (isContentPolicyRefusal) {
          console.warn(`⚠️ Content policy refusal for topic: ${topicName}, difficulty: ${difficultyLevel}`);
          return NextResponse.json({ 
            error: 'AI refused to generate content for this topic. This may be due to content policies or topic complexity.',
            details: `Topic "${topicName}" with ${difficultyLevel} difficulty triggered content policy refusal`,
            type: 'CONTENT_POLICY_REFUSAL',
            suggestion: 'Try a different topic or simpler difficulty level'
          }, { status: 422 });
        }
        
        return NextResponse.json({ 
          error: 'Failed to generate exercises with AI',
          details: openaiError.message,
          type: 'OPENAI_ERROR'
        }, { status: 500 });
      }

      // Enhanced validation to prevent empty exercises
      if (!exerciseContent || !exerciseContent.questions || exerciseContent.questions.length === 0) {
        console.error(`❌ AI generated empty content for ${difficultyLevel} difficulty [${requestId}]:`, exerciseContent);
        console.error(`❌ Expected ${difficultyCount} questions but received none`);
        continue; // Skip this difficulty but continue with others
      }

      console.log(`🔍 Validating ${exerciseContent.questions.length} generated questions for ${difficultyLevel} difficulty [${requestId}]...`);

      // Validate question quality
      const validQuestions = exerciseContent.questions.filter((q, index) => {
        const hasValidQuestion = q.question_da && q.question_da.trim().length > 0;
        const hasValidAnswer = q.correct_answer && 
          (Array.isArray(q.correct_answer) ? q.correct_answer.length > 0 : q.correct_answer.trim().length > 0);
        const hasValidExplanation = q.explanation_da && q.explanation_da.trim().length > 0;
        
        // Log validation details for debugging
        if (!hasValidQuestion) {
          console.warn(`⚠️ Question ${index + 1} has invalid question_da: "${q.question_da}"`);
        }
        if (!hasValidAnswer) {
          console.warn(`⚠️ Question ${index + 1} has invalid correct_answer: "${q.correct_answer}"`);
        }
        if (!hasValidExplanation) {
          console.warn(`⚠️ Question ${index + 1} has invalid explanation_da: "${q.explanation_da}"`);
        }
        
        // Additional validation for fill_blank exercises
        if (exerciseType === 'fill_blank') {
          const hasUnderscore = q.question_da && q.question_da.includes('_');
          const underscoreCount = (q.question_da.match(/_/g) || []).length;
          const hasSimpleAnswer = q.correct_answer && typeof q.correct_answer === 'string' && 
                                  q.correct_answer.trim().split(' ').length <= 3; // Max 3 words
          
          if (!hasUnderscore) {
            console.warn(`⚠️ Fill_blank question missing underscore: "${q.question_da}"`);
            return false;
          }
          if (underscoreCount !== 1) {
            console.warn(`⚠️ Fill_blank question has ${underscoreCount} underscores, expected 1: "${q.question_da}"`);
            return false;
          }
          if (!hasSimpleAnswer) {
            console.warn(`⚠️ Fill_blank answer too complex: "${q.correct_answer}"`);
            return false;
          }
        }
        
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

    // Create exactly the number of exercises the user requested
    const exercisesToCreate = [];
    let exerciseCounter = 1;
    
    // Calculate total exercises needed across all difficulties
    const totalExercisesNeeded = Math.min(count, maxExercisesCanCreate);
    console.log(`🎯 Creating exactly ${totalExercisesNeeded} exercises as requested by user [${requestId}]`);
    
    // Distribute questions across the requested number of exercises
    let allQuestions = [];
    for (const difficultyExercises of allGeneratedExercises) {
      allQuestions = allQuestions.concat(difficultyExercises.questions.map(q => ({
        ...q,
        difficulty: difficultyExercises.difficulty,
        metadata: difficultyExercises.metadata
      })));
    }
    
    const questionsPerExercise = Math.floor(allQuestions.length / totalExercisesNeeded);
    const extraQuestions = allQuestions.length % totalExercisesNeeded;
    
    console.log(`📝 Distributing ${allQuestions.length} questions across ${totalExercisesNeeded} exercises (~${questionsPerExercise} questions each) [${requestId}]`);
    
    let questionIndex = 0;
    for (let exerciseNum = 0; exerciseNum < totalExercisesNeeded; exerciseNum++) {
      // Some exercises get one extra question if there are remainders
      const questionsForThisExercise = questionsPerExercise + (exerciseNum < extraQuestions ? 1 : 0);
      const questionsSlice = allQuestions.slice(questionIndex, questionIndex + questionsForThisExercise);
      questionIndex += questionsForThisExercise;
      
      // Determine the primary difficulty for this exercise (most common in the slice)
      const difficultyCounts = {};
      questionsSlice.forEach(q => {
        difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
      });
      const primaryDifficulty = Object.keys(difficultyCounts).reduce((a, b) => 
        difficultyCounts[a] > difficultyCounts[b] ? a : b
      );
      
      const exerciseData = {
        topic_id: topicId,
        level: finalLevel,
        type: getExerciseTypeFromQuestionType(exerciseType),
        title_da: `${finalTopicName} - ${exerciseType} (${primaryDifficulty.toUpperCase()}) #${exerciseCounter}`,
        title_es: `${finalTopicName} - ${exerciseType} (${primaryDifficulty.toUpperCase()}) #${exerciseCounter}`,
        description_da: `AI-genereret ${primaryDifficulty} øvelse om ${finalTopicName} med ${questionsSlice.length} spørgsmål`,
        description_es: `Ejercicio ${primaryDifficulty} generado por IA sobre ${finalTopicName} con ${questionsSlice.length} preguntas`,
        content: {
          instructions_da: `Besvar følgende spørgsmål om ${finalTopicName}. Sværhedsgrad: ${primaryDifficulty}`,
          questions: questionsSlice,
          metadata: {
            difficulty: primaryDifficulty,
            generated_at: new Date().toISOString(),
            ai_generated: true,
            topic_coverage: questionsSlice[0]?.metadata?.topic_coverage || [],
            proficiency_indicators: questionsSlice[0]?.metadata?.proficiency_indicators || []
          }
        },
        ai_generated: true,
      };

      exercisesToCreate.push(exerciseData);
      exerciseCounter++;
    }

    // Save the generated exercises to database using admin client to bypass RLS
    console.log(`💾 Saving ${exercisesToCreate.length} exercises to database [${requestId}]...`);
    console.log(`📊 Database operation started at: ${new Date().toISOString()}`);
    console.log('📊 Exercise data preview (first exercise):', JSON.stringify(exercisesToCreate[0], null, 2));
    
    const dbStartTime = Date.now();
    
    // Use admin client for database insertion to avoid RLS recursion issues
    const { data: newExercises, error: insertError } = await adminSupabase
      .from('exercises')
      .insert(exercisesToCreate)
      .select();

    const dbTime = Date.now() - dbStartTime;
    console.log(`⏱️ Database operation completed in: ${dbTime}ms (${(dbTime/1000).toFixed(1)}s)`);

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      console.error('❌ Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        exercisesToCreateCount: exercisesToCreate.length,
        firstExercisePreview: exercisesToCreate[0]?.title_da
      });
      return NextResponse.json({ 
        error: 'Failed to save exercises to database',
        details: insertError.message,
        dbError: insertError
      }, { status: 500 });
    }

    console.log(`✅ Successfully created ${newExercises?.length || 0} exercises in database [${requestId}]`);
    console.log(`📝 Exercise IDs created:`, newExercises?.map(e => e.id).join(', '));

    // Calculate metadata without flatMap (ES2015 compatible)
    const topicCoverage: string[] = [];
    const proficiencyIndicators: string[] = [];
    
    allGeneratedExercises.forEach(exercise => {
      if (exercise.metadata?.topic_coverage) {
        topicCoverage.push(...exercise.metadata.topic_coverage);
      }
      if (exercise.metadata?.proficiency_indicators) {
        proficiencyIndicators.push(...exercise.metadata.proficiency_indicators);
      }
    });

    const totalRequestTime = Date.now() - requestStartTime;
    console.log(`🎉 COMPLETE SUCCESS! Total request time: ${totalRequestTime}ms (${(totalRequestTime/1000).toFixed(1)}s) [${requestId}]`);

    return NextResponse.json({
      success: true,
      exercisesCreated: newExercises?.length || 0,
      exercises: newExercises,
      requestId,
      timing: {
        totalRequestTime: `${totalRequestTime}ms`,
        databaseTime: `${dbTime}ms`
      },
      metadata: {
        totalQuestions,
        difficultiesGenerated: allGeneratedExercises.map(e => e.difficulty),
        topicCoverage,
        proficiencyIndicators
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

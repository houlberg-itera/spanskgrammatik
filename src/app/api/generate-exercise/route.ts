import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExercise } from '@/lib/openai';
import { SpanishLevel } from '@/types/database';

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🚀 Starting single exercise generation request [${requestId}] at ${new Date().toISOString()}...`);
  
  try {
    console.log(`📡 Creating Supabase client [${requestId}]...`);
    const supabase = await createClient();
    
    // Check authentication
    console.log('🔐 Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Authentication successful for user:', user.email);

    console.log(`📝 Parsing request body [${requestId}]...`);
    const body = await request.json();
    console.log(`📦 Request body [${requestId}]:`, JSON.stringify(body, null, 2));
    const { topicId, exerciseType } = body;

    if (!topicId || !exerciseType) {
      console.error('❌ Missing required fields:', { topicId, exerciseType });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔍 Fetching topic details for ID: ${topicId} [${requestId}]...`);
    // Fetch topic details
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (topicError || !topic) {
      console.error('❌ Topic not found:', topicError);
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    console.log(`✅ Topic details fetched [${requestId}]:`, {
      level: topic.level,
      name: topic.name_da,
      description: topic.description_da
    });

    console.log(`🤖 Starting OpenAI generation [${requestId}]...`);
    console.log(`⏰ Generation start time: ${new Date().toISOString()}`);
    console.log(`🎯 Parameters: Level=${topic.level}, Topic=${topic.name_da}, Type=${exerciseType}, Questions=5`);
    
    const generationStartTime = Date.now();
    // Generate exercise content using OpenAI
    const exerciseContent = await generateExercise({
      level: topic.level as SpanishLevel,
      topic: topic.name_da,
      topicDescription: topic.description_da || '',
      exerciseType,
      questionCount: 5,
    });
    
    const generationTime = Date.now() - generationStartTime;
    console.log(`✅ OpenAI generation completed [${requestId}]`);
    console.log(`⏱️ Generation took: ${generationTime}ms (${(generationTime/1000).toFixed(1)}s)`);
    console.log(`📊 Generated content preview:`, {
      questionsCount: exerciseContent?.questions?.length || 0,
      firstQuestionPreview: exerciseContent?.questions?.[0]?.question_da?.substring(0, 50) + '...'
    });

    console.log(`💾 Saving exercise to database [${requestId}]...`);
    const dbStartTime = Date.now();
    // Save the generated exercise to database
    const { data: newExercise, error: insertError } = await supabase
      .from('exercises')
      .insert({
        topic_id: topicId,
        level: topic.level,
        type: exerciseType,
        title_da: `AI-genereret øvelse: ${topic.name_da}`,
        title_es: `Ejercicio generado por IA: ${topic.name_es}`,
        description_da: `Automatisk genereret øvelse om ${topic.name_da}`,
        description_es: `Ejercicio generado automáticamente sobre ${topic.name_es}`,
        content: exerciseContent,
        ai_generated: true,
      })
      .select()
      .single();

    const dbTime = Date.now() - dbStartTime;
    console.log(`⏱️ Database operation completed in: ${dbTime}ms (${(dbTime/1000).toFixed(1)}s)`);

    if (insertError) {
      console.error('❌ Database insert error [${requestId}]:', insertError);
      console.error('❌ Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json({ error: 'Failed to save exercise' }, { status: 500 });
    }

    const totalRequestTime = Date.now() - requestStartTime;
    console.log(`✅ Successfully created exercise with ID: ${newExercise?.id} [${requestId}]`);
    console.log(`🎉 COMPLETE SUCCESS! Total request time: ${totalRequestTime}ms (${(totalRequestTime/1000).toFixed(1)}s) [${requestId}]`);

    return NextResponse.json({ 
      exercise: newExercise,
      requestId,
      timing: {
        totalRequestTime: `${totalRequestTime}ms`,
        generationTime: `${generationTime}ms`,
        databaseTime: `${dbTime}ms`
      }
    });
  } catch (error) {
    const totalRequestTime = Date.now() - requestStartTime;
    console.error(`❌ Error generating exercise [${requestId}]:`, error);
    console.error(`❌ Request failed after: ${totalRequestTime}ms (${(totalRequestTime/1000).toFixed(1)}s)`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

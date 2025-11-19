import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to duplicate Spanish topics and exercises for Portuguese
 * POST /api/admin/duplicate-content-for-language
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get request body
    const { sourceLanguage = 'es', targetLanguage = 'pt' } = await request.json();

    console.log(`🔄 Starting duplication: ${sourceLanguage} → ${targetLanguage}`);

    // Step 1: Duplicate Topics
    const { data: sourceTopics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('target_language', sourceLanguage);

    if (topicsError) {
      console.error('Error fetching topics:', topicsError);
      return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
    }

    console.log(`📚 Found ${sourceTopics?.length || 0} topics to duplicate`);

    const duplicatedTopics = [];
    const topicIdMapping: { [key: number]: number } = {}; // Map old ID to new ID

    for (const topic of sourceTopics || []) {
      // Check if topic already exists for target language
      const { data: existingTopic } = await supabase
        .from('topics')
        .select('id')
        .eq('level', topic.level)
        .eq('target_language', targetLanguage)
        .eq('name_da', topic.name_da)
        .single();

      if (existingTopic) {
        console.log(`⏭️ Topic "${topic.name_da}" already exists for ${targetLanguage}, skipping`);
        topicIdMapping[topic.id] = existingTopic.id;
        continue;
      }

      // Create new topic for target language
      const { data: newTopic, error: insertError } = await supabase
        .from('topics')
        .insert({
          level: topic.level,
          target_language: targetLanguage,
          name_da: topic.name_da,
          name: topic.name, // Generic name field in target language
          description_da: topic.description_da,
          description: topic.description, // Generic description in target language
          order_index: topic.order_index
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating topic "${topic.name_da}":`, insertError);
        continue;
      }

      if (newTopic) {
        duplicatedTopics.push(newTopic);
        topicIdMapping[topic.id] = newTopic.id;
        console.log(`✅ Created topic: ${topic.name_da} (ID: ${topic.id} → ${newTopic.id})`);
      }
    }

    // Step 2: Duplicate Exercises
    const { data: sourceExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('target_language', sourceLanguage);

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError);
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
    }

    console.log(`📝 Found ${sourceExercises?.length || 0} exercises to duplicate`);

    const duplicatedExercises = [];
    let skippedExercises = 0;

    for (const exercise of sourceExercises || []) {
      // Get the new topic ID
      const newTopicId = topicIdMapping[exercise.topic_id];
      
      if (!newTopicId) {
        console.log(`⚠️ No topic mapping for exercise ${exercise.id}, skipping`);
        skippedExercises++;
        continue;
      }

      // Check if exercise already exists
      const { data: existingExercise } = await supabase
        .from('exercises')
        .select('id')
        .eq('topic_id', newTopicId)
        .eq('target_language', targetLanguage)
        .eq('title_da', exercise.title_da)
        .single();

      if (existingExercise) {
        console.log(`⏭️ Exercise "${exercise.title_da}" already exists, skipping`);
        skippedExercises++;
        continue;
      }

      // Update content to use generic language fields
      const updatedContent = { ...exercise.content };
      if (updatedContent.questions) {
        updatedContent.questions = updatedContent.questions.map((q: any) => ({
          ...q,
          question: q.question, // Keep generic question field
          explanation: q.explanation // Keep generic explanation field
        }));
        updatedContent.instructions = updatedContent.instructions; // Keep generic instructions
      }

      // Create new exercise for target language
      const { data: newExercise, error: insertError } = await supabase
        .from('exercises')
        .insert({
          topic_id: newTopicId,
          level: exercise.level,
          target_language: targetLanguage,
          type: exercise.type,
          title_da: exercise.title_da,
          title: exercise.title, // Generic title field
          description_da: exercise.description_da,
          description: exercise.description, // Generic description field
          content: updatedContent,
          ai_generated: exercise.ai_generated
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating exercise "${exercise.title_da}":`, insertError);
        continue;
      }

      if (newExercise) {
        duplicatedExercises.push(newExercise);
        console.log(`✅ Created exercise: ${exercise.title_da} (ID: ${exercise.id} → ${newExercise.id})`);
      }
    }

    // Return summary
    const summary = {
      success: true,
      sourceLanguage,
      targetLanguage,
      topics: {
        found: sourceTopics?.length || 0,
        created: duplicatedTopics.length,
        skipped: (sourceTopics?.length || 0) - duplicatedTopics.length
      },
      exercises: {
        found: sourceExercises?.length || 0,
        created: duplicatedExercises.length,
        skipped: skippedExercises
      },
      topicIdMapping
    };

    console.log('📊 Duplication Summary:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error in duplication:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to duplicate exercises for existing Portuguese topics
 * POST /api/admin/duplicate-exercises-only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { sourceLanguage = 'es', targetLanguage = 'pt' } = await request.json();

    console.log(`🔄 Duplicating EXERCISES ONLY: ${sourceLanguage} → ${targetLanguage}`);

    // Step 1: Get topic mapping (Spanish topic ID → Portuguese topic ID)
    const { data: spanishTopics } = await supabase
      .from('topics')
      .select('id, name_da, level')
      .eq('target_language', sourceLanguage);

    const { data: portugueseTopics } = await supabase
      .from('topics')
      .select('id, name_da, level')
      .eq('target_language', targetLanguage);

    // Create mapping by matching name_da and level
    const topicMapping: { [key: number]: number } = {};
    for (const esTopic of spanishTopics || []) {
      const ptTopic = portugueseTopics?.find(
        pt => pt.name_da === esTopic.name_da && pt.level === esTopic.level
      );
      if (ptTopic) {
        topicMapping[esTopic.id] = ptTopic.id;
        console.log(`📍 Mapped: ES topic ${esTopic.id} (${esTopic.name_da}) → PT topic ${ptTopic.id}`);
      }
    }

    console.log(`📊 Topic mapping created: ${Object.keys(topicMapping).length} topics mapped`);

    // Step 2: Get Spanish exercises
    const { data: spanishExercises } = await supabase
      .from('exercises')
      .select('*')
      .eq('target_language', sourceLanguage);

    console.log(`📝 Found ${spanishExercises?.length || 0} Spanish exercises`);

    let created = 0;
    let skipped = 0;

    // Step 3: Duplicate exercises
    for (const exercise of spanishExercises || []) {
      const newTopicId = topicMapping[exercise.topic_id];

      if (!newTopicId) {
        console.log(`⚠️ No Portuguese topic for Spanish topic ${exercise.topic_id}, skipping exercise ${exercise.id}`);
        skipped++;
        continue;
      }

      // Check if exercise already exists
      const { data: existing } = await supabase
        .from('exercises')
        .select('id')
        .eq('topic_id', newTopicId)
        .eq('target_language', targetLanguage)
        .eq('title_da', exercise.title_da)
        .single();

      if (existing) {
        console.log(`⏭️ Exercise "${exercise.title_da}" already exists for PT topic ${newTopicId}, skipping`);
        skipped++;
        continue;
      }

      // Copy content and ensure generic fields are used
      const updatedContent = { ...exercise.content };
      if (updatedContent.questions) {
        updatedContent.questions = updatedContent.questions.map((q: any) => ({
          ...q,
          question: q.question || q.question_es, // Use generic or fallback to Spanish
          explanation: q.explanation || q.explanation_es
        }));
      }

      // Create Portuguese exercise
      const { data: newExercise, error } = await supabase
        .from('exercises')
        .insert({
          topic_id: newTopicId,
          level: exercise.level,
          target_language: targetLanguage,
          type: exercise.type,
          title_da: exercise.title_da,
          title: exercise.title || exercise.title_es, // Use generic or fallback
          description_da: exercise.description_da,
          description: exercise.description || exercise.description_es,
          content: updatedContent,
          ai_generated: exercise.ai_generated
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating exercise "${exercise.title_da}":`, error);
        skipped++;
        continue;
      }

      if (newExercise) {
        created++;
        console.log(`✅ Created: ${exercise.title_da} (ES ${exercise.id} → PT ${newExercise.id})`);
      }
    }

    const summary = {
      success: true,
      sourceLanguage,
      targetLanguage,
      topicsMapped: Object.keys(topicMapping).length,
      exercises: {
        found: spanishExercises?.length || 0,
        created,
        skipped
      }
    };

    console.log('📊 Summary:', summary);
    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error duplicating exercises:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

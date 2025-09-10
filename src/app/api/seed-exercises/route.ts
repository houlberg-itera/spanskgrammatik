import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // First, ensure we have a topic to reference
    const { data: existingTopics } = await supabase
      .from('topics')
      .select('*')
      .eq('level', 'A1')
      .limit(1);

    let topicId = 1; // Default fallback
    
    if (existingTopics && existingTopics.length > 0) {
      topicId = existingTopics[0].id;
    } else {
      // Create a topic if none exists
      const { data: newTopic } = await supabase
        .from('topics')
        .insert([{
          level: 'A1',
          name_da: 'Grundlæggende grammatik',
          name_es: 'Gramática básica',
          description_da: 'Grundlæggende spansk grammatik for begyndere',
          order_index: 1
        }])
        .select()
        .single();
      
      if (newTopic) {
        topicId = newTopic.id;
      }
    }

    // First, let's clear existing sample data
    await supabase.from('exercises').delete().eq('ai_generated', false);

    // Insert the sample exercise data
    const sampleExercise = {
      topic_id: topicId,
      level: 'A1',
      type: 'grammar',
      title_da: 'Ser eller Estar - Grundlæggende',
      title_es: 'Ser o Estar - Básico',
      description_da: 'Øv dig i at vælge mellem ser og estar',
      description_es: 'Practica eligir entre ser y estar',
      content: {
        instructions_da: "Vælg den korrekte form af enten 'ser' eller 'estar' for hvert spørgsmål.",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question_da: "María ___ lærer (hun arbejder som lærer)",
            options: ["es", "está", "son", "están"],
            correct_answer: "es",
            explanation_da: "Vi bruger 'ser' (es) for permanente egenskaber som profession. María es profesora = María er lærer (som erhverv).",
            points: 1
          },
          {
            id: "q2",
            type: "multiple_choice",
            question_da: "El café ___ caliente (kaffen er varm lige nu)",
            options: ["es", "está", "son", "están"],
            correct_answer: "está",
            explanation_da: "Vi bruger 'estar' (está) for midlertidige tilstande som temperatur. Kaffen er varm lige nu, men den kan blive kold.",
            points: 1
          },
          {
            id: "q3",
            type: "multiple_choice",
            question_da: "Nosotros ___ en casa (vi er hjemme)",
            options: ["somos", "estamos", "es", "está"],
            correct_answer: "estamos",
            explanation_da: "Vi bruger 'estar' (estamos) for placering/position. At være hjemme er en midlertidig placering.",
            points: 1
          },
          {
            id: "q4",
            type: "multiple_choice",
            question_da: "Ella ___ muy inteligente (hun er meget intelligent)",
            options: ["es", "está", "son", "están"],
            correct_answer: "es",
            explanation_da: "Vi bruger 'ser' (es) for permanente karakteristika som intelligens. Dette er en grundlæggende egenskab ved personen.",
            points: 1
          },
          {
            id: "q5",
            type: "multiple_choice",
            question_da: "Los niños ___ cansados (børnene er trætte)",
            options: ["son", "están", "es", "está"],
            correct_answer: "están",
            explanation_da: "Vi bruger 'estar' (están) for midlertidige tilstande som at være træt. Børnene er trætte nu, men de vil ikke altid være det.",
            points: 1
          }
        ]
      },
      ai_generated: false
    };

    const { data, error } = await supabase
      .from('exercises')
      .insert([sampleExercise])
      .select();

    if (error) {
      console.error('Error inserting sample exercise:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Sample exercises loaded successfully',
      topicId,
      data 
    });

  } catch (error) {
    console.error('Error loading sample exercises:', error);
    return NextResponse.json(
      { error: 'Failed to load sample exercises' },
      { status: 500 }
    );
  }
}

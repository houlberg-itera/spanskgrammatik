import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    // Use service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    \n
    // Check if sample exercises already exist
    const { data: existingExercises, error: checkError } = await supabase
      .from('exercises')
      .select('id, title_da, ai_generated')
      .eq('ai_generated', false);

    if (checkError) {
      throw checkError;
    }

    if (existingExercises && existingExercises.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Sample exercises already exist',
        existingCount: existingExercises.length,
        exercises: existingExercises
      });
    }

    // Sample exercises data (from the SQL file)
    const sampleExercises = [
      {
        topic_id: 2, // Ser vs Estar
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
      },
      {
        topic_id: 1, // Substantiver og artikler
        level: 'A1',
        type: 'grammar',
        title_da: 'Substantiver og Artikler - Grundlæggende',
        title_es: 'Sustantivos y Artículos - Básico',
        description_da: 'Lær at bruge el, la, un, una korrekt',
        description_es: 'Aprende a usar el, la, un, una correctamente',
        content: {
          instructions_da: "Vælg den korrekte artikel for hvert substantiv.",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              question_da: "___ perro (hunden)",
              options: ["el", "la", "un", "una"],
              correct_answer: "el",
              explanation_da: "'Perro' (hund) er hankøn, derfor bruger vi 'el' som bestemt artikel.",
              points: 1
            },
            {
              id: "q2",
              type: "multiple_choice",
              question_da: "___ manzana (et æble)",
              options: ["el", "la", "un", "una"],
              correct_answer: "una",
              explanation_da: "'Manzana' (æble) er hunkøn, og vi vil have en ubestemt artikel, derfor 'una'.",
              points: 1
            },
            {
              id: "q3",
              type: "multiple_choice",
              question_da: "___ casa (huset)",
              options: ["el", "la", "un", "una"],
              correct_answer: "la",
              explanation_da: "'Casa' (hus) er hunkøn, derfor bruger vi 'la' som bestemt artikel.",
              points: 1
            },
            {
              id: "q4",
              type: "multiple_choice",
              question_da: "___ libro (en bog)",
              options: ["el", "la", "un", "una"],
              correct_answer: "un",
              explanation_da: "'Libro' (bog) er hankøn, og vi vil have en ubestemt artikel, derfor 'un'.",
              points: 1
            },
            {
              id: "q5",
              type: "multiple_choice",
              question_da: "___ problema (problemet)",
              options: ["el", "la", "un", "una"],
              correct_answer: "el",
              explanation_da: "'Problema' ender på -a men er hankøn! Derfor bruger vi 'el'.",
              points: 1
            }
          ]
        },
        ai_generated: false
      },
      {
        topic_id: 4, // Præsens af regelmæssige verbum
        level: 'A1',
        type: 'grammar',
        title_da: 'Præsens - Regelmæssige Verbum',
        title_es: 'Presente - Verbos Regulares',
        description_da: 'Øv konjugation af regelmæssige verbum i præsens',
        description_es: 'Practica la conjugación de verbos regulares en presente',
        content: {
          instructions_da: "Konjuger verbet i den korrekte form for den givne person.",
          questions: [
            {
              id: "q1",
              type: "fill_in_blank",
              question_da: "Yo ___ (hablar - jeg taler)",
              correct_answer: "hablo",
              explanation_da: "Hablar er et -ar verbum. For 'yo' fjerner vi -ar og tilføjer -o: hablo.",
              points: 1
            },
            {
              id: "q2",
              type: "fill_in_blank",
              question_da: "Tú ___ (comer - du spiser)",
              correct_answer: "comes",
              explanation_da: "Comer er et -er verbum. For 'tú' fjerner vi -er og tilføjer -es: comes.",
              points: 1
            },
            {
              id: "q3",
              type: "fill_in_blank",
              question_da: "Ella ___ (vivir - hun bor)",
              correct_answer: "vive",
              explanation_da: "Vivir er et -ir verbum. For 'ella' fjerner vi -ir og tilføjer -e: vive.",
              points: 1
            },
            {
              id: "q4",
              type: "fill_in_blank",
              question_da: "Nosotros ___ (estudiar - vi studerer)",
              correct_answer: "estudiamos",
              explanation_da: "Estudiar er et -ar verbum. For 'nosotros' fjerner vi -ar og tilføjer -amos: estudiamos.",
              points: 1
            },
            {
              id: "q5",
              type: "fill_in_blank",
              question_da: "Ellos ___ (escribir - de skriver)",
              correct_answer: "escriben",
              explanation_da: "Escribir er et -ir verbum. For 'ellos' fjerner vi -ir og tilføjer -en: escriben.",
              points: 1
            }
          ]
        },
        ai_generated: false
      }
    ];

    // Insert sample exercises
    const { data: insertedExercises, error: insertError } = await supabase
      .from('exercises')
      .insert(sampleExercises)
      .select();

    if (insertError) {
      console.error('Error inserting sample exercises:', insertError);
      throw insertError;
    }

    \n
    return NextResponse.json({
      success: true,
      message: `Successfully loaded ${insertedExercises?.length || 0} sample exercises`,
      exercises: insertedExercises,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error loading sample exercises:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load sample exercises',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

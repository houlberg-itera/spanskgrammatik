import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    \n    
    // Create server-side Supabase client with service role for admin operations
    const supabase = await createClient();
    
    // For sample data loading, we'll use admin privileges
    \n
    // Sample exercise data to insert directly
    const sampleExercises = [
      {
        topic_id: 2,
        level: 'A1',
        type: 'grammar',
        title_da: 'Ser eller Estar - Grundlæggende',
        title_es: 'Ser o Estar - Básico',
        description_da: 'Øv dig i at vælge mellem ser og estar',
        description_es: 'Practica eligir entre ser y estar',
        content: {
          "instructions_da": "Vælg den korrekte form af enten 'ser' eller 'estar' for hvert spørgsmål.",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question_da": "María ___ lærer (hun arbejder som lærer)",
              "options": ["es", "está", "son", "están"],
              "correct_answer": "es",
              "explanation_da": "Vi bruger 'ser' (es) for permanente egenskaber som profession. María es profesora = María er lærer (som erhverv).",
              "points": 1
            },
            {
              "id": "q2",
              "type": "multiple_choice",
              "question_da": "El café ___ caliente (kaffen er varm lige nu)",
              "options": ["es", "está", "son", "están"],
              "correct_answer": "está",
              "explanation_da": "Vi bruger 'estar' (está) for midlertidige tilstande som temperatur. Kaffen er varm lige nu, men den kan blive kold.",
              "points": 1
            },
            {
              "id": "q3",
              "type": "multiple_choice",
              "question_da": "Nosotros ___ en casa (vi er hjemme)",
              "options": ["somos", "estamos", "es", "está"],
              "correct_answer": "estamos",
              "explanation_da": "Vi bruger 'estar' (estamos) for placering/position. At være hjemme er en midlertidig placering.",
              "points": 1
            },
            {
              "id": "q4",
              "type": "multiple_choice",
              "question_da": "Ella ___ muy inteligente (hun er meget intelligent)",
              "options": ["es", "está", "son", "están"],
              "correct_answer": "es",
              "explanation_da": "Vi bruger 'ser' (es) for permanente karakteristika som intelligens. Dette er en grundlæggende egenskab ved personen.",
              "points": 1
            }
          ]
        },
        ai_generated: false
      },
      {
        topic_id: 1,
        level: 'A1',
        type: 'grammar',
        title_da: 'Spanske Artikler - El og La',
        title_es: 'Artículos Españoles - El y La',
        description_da: 'Lær at bruge el og la korrekt',
        description_es: 'Aprende a usar el y la correctamente',
        content: {
          "instructions_da": "Vælg den korrekte artikel for hvert substantiv.",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question_da": "___ perro (hunden)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "el",
              "explanation_da": "Perro er hankøn, derfor bruger vi 'el'.",
              "points": 1
            },
            {
              "id": "q2",
              "type": "multiple_choice",
              "question_da": "___ mesa (bordet)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "la",
              "explanation_da": "Mesa er hunkøn, derfor bruger vi 'la'.",
              "points": 1
            },
            {
              "id": "q3",
              "type": "multiple_choice",
              "question_da": "___ problema (problemet)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "el",
              "explanation_da": "Problema ender på -a men er hankøn - en undtagelse!",
              "points": 1
            },
            {
              "id": "q4",
              "type": "multiple_choice",
              "question_da": "___ mano (hånden)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "la",
              "explanation_da": "Mano ender på -o men er hunkøn - en undtagelse!",
              "points": 1
            }
          ]
        },
        ai_generated: false
      },
      {
        topic_id: 4,
        level: 'A1',
        type: 'grammar',
        title_da: 'Præsens - Regelmæssige Verber',
        title_es: 'Presente - Verbos Regulares',
        description_da: 'Øv dig i at bøje regelmæssige verber i præsens',
        description_es: 'Practica conjugar verbos regulares en presente',
        content: {
          "instructions_da": "Bøj verbet i parenteser til den korrekte form i præsens.",
          "questions": [
            {
              "id": "q1",
              "type": "fill_in_blank",
              "question_da": "Yo ___ (hablar) español",
              "correct_answer": "hablo",
              "explanation_da": "Hablar er et -ar verbum. For 'yo' fjerner vi -ar og tilføjer -o: hablo.",
              "points": 1
            },
            {
              "id": "q2",
              "type": "fill_in_blank",
              "question_da": "Tú ___ (comer) fruta",
              "correct_answer": "comes",
              "explanation_da": "Comer er et -er verbum. For 'tú' fjerner vi -er og tilføjer -es: comes.",
              "points": 1
            },
            {
              "id": "q3",
              "type": "fill_in_blank",
              "question_da": "Ella ___ (vivir) en Madrid",
              "correct_answer": "vive",
              "explanation_da": "Vivir er et -ir verbum. For 'ella' fjerner vi -ir og tilføjer -e: vive.",
              "points": 1
            }
          ]
        },
        ai_generated: false
      },
      {
        topic_id: 1,
        level: 'A1',
        type: 'grammar',
        title_da: 'Ubestemte Artikler - Un og Una',
        title_es: 'Artículos Indefinidos - Un y Una',
        description_da: 'Lær at bruge un og una korrekt',
        description_es: 'Aprende a usar un y una correctamente',
        content: {
          "instructions_da": "Vælg den korrekte ubestemte artikel for hvert substantiv.",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question_da": "___ gato (en kat)",
              "options": ["un", "una", "unos", "unas"],
              "correct_answer": "un",
              "explanation_da": "Gato er hankøn, derfor bruger vi 'un'.",
              "points": 1
            },
            {
              "id": "q2",
              "type": "multiple_choice",
              "question_da": "___ casa (et hus)",
              "options": ["un", "una", "unos", "unas"],
              "correct_answer": "una",
              "explanation_da": "Casa er hunkøn, derfor bruger vi 'una'.",
              "points": 1
            },
            {
              "id": "q3",
              "type": "multiple_choice",
              "question_da": "___ libro (en bog)",
              "options": ["un", "una", "unos", "unas"],
              "correct_answer": "un",
              "explanation_da": "Libro er hankøn, derfor bruger vi 'un'.",
              "points": 1
            }
          ]
        },
        ai_generated: false
      },
      {
        topic_id: 5,
        level: 'A2',
        type: 'grammar',
        title_da: 'Datid - Pretérito Perfecto',
        title_es: 'Pretérito Perfecto',
        description_da: 'Øv dig i at bruge pretérito perfecto (haber + participium)',
        description_es: 'Practica usar el pretérito perfecto (haber + participio)',
        content: {
          "instructions_da": "Bøj sætningen til pretérito perfecto ved at bruge haber + participium.",
          "questions": [
            {
              "id": "q1",
              "type": "fill_in_blank",
              "question_da": "Yo ___ ___ (comer) en el restaurante",
              "correct_answer": "he comido",
              "explanation_da": "Pretérito perfecto dannes med 'haber' + participium. 'He comido' = jeg har spist.",
              "points": 1
            },
            {
              "id": "q2",
              "type": "fill_in_blank",
              "question_da": "Nosotros ___ ___ (estudiar) mucho",
              "correct_answer": "hemos estudiado",
              "explanation_da": "'Hemos estudiado' = vi har studeret. Haber bøjes til 'hemos' for 'nosotros'.",
              "points": 1
            }
          ]
        },
        ai_generated: false
      }
    ];

    const results = [];
    
    // Insert each sample exercise
    for (let i = 0; i < sampleExercises.length; i++) {
      const exercise = sampleExercises[i];
      \n      
      try {
        const { data, error } = await supabase
          .from('exercises')
          .insert([exercise])
          .select();

        if (error) {
          console.error(`Error inserting exercise ${i + 1}:`, error);
          results.push({ exercise: i + 1, error: error.message });
        } else {
          \n          results.push({ exercise: i + 1, success: true, id: data[0]?.id });
        }
      } catch (err) {
        console.error(`Exception inserting exercise ${i + 1}:`, err);
        results.push({ exercise: i + 1, error: (err as Error).message });
      }
    }

    // Check how many exercises we have now
    const { data: exerciseCount, error: countError } = await supabase
      .from('exercises')
      .select('id', { count: 'exact' });

    \n
    return NextResponse.json({
      message: 'Sample data loading completed',
      results,
      totalExercises: exerciseCount?.length || 0,
      errors: results.filter(r => r.error).length,
      success: results.filter(r => r.success).length
    });

  } catch (error) {
    console.error('Error loading sample data:', error);
    return NextResponse.json(
      { error: 'Failed to load sample data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check current state
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, title_da, level, type, ai_generated');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      totalExercises: exercises.length,
      exercises: exercises.map((ex: any) => ({
        id: ex.id,
        title: ex.title_da,
        level: ex.level,
        type: ex.type,
        aiGenerated: ex.ai_generated
      }))
    });

  } catch (error) {
    console.error('Error checking data:', error);
    return NextResponse.json(
      { error: 'Failed to check data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

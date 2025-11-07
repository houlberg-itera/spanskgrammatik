import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    
    const supabase = await createClient();
    
    // Test basic connection first
    const { data: testData, error: testError } = await supabase
      .from('exercises')
      .select('id, title_da')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', testError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: testError.message
      }, { status: 500 });
    }
    
    // Sample exercises with enhanced content
    const sampleExercises = [
      {
        topic_id: 1,
        level: 'A1',
        type: 'grammar',
        title_da: 'Bestemte Artikler - El og La',
        title_es: 'Artículos Definidos - El y La',
        description_da: 'Lær at bruge el og la korrekt med danske oversættelser',
        description_es: 'Aprende a usar el y la correctamente',
        content: {
          "instructions_da": "Vælg den korrekte bestemmende artikel for hvert substantiv. Husk: el for hankøn, la for hunkøn.",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question_da": "___ perro (hunden)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "el",
              "explanation_da": "Perro er hankøn, derfor bruger vi 'el perro' (hunden).",
              "points": 1
            },
            {
              "id": "q2",
              "type": "multiple_choice",
              "question_da": "___ mesa (bordet)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "la",
              "explanation_da": "Mesa er hunkøn, derfor bruger vi 'la mesa' (bordet).",
              "points": 1
            },
            {
              "id": "q3",
              "type": "multiple_choice",
              "question_da": "___ problema (problemet)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "el",
              "explanation_da": "UNDTAGELSE! Problema ender på -a men er hankøn - derfor 'el problema'.",
              "points": 1
            },
            {
              "id": "q4",
              "type": "multiple_choice",
              "question_da": "___ mano (hånden)",
              "options": ["el", "la", "los", "las"],
              "correct_answer": "la",
              "explanation_da": "UNDTAGELSE! Mano ender på -o men er hunkøn - derfor 'la mano'.",
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
        description_da: 'Øv dig i at bruge un og una med kontekst',
        description_es: 'Practica usando un y una con contexto',
        content: {
          "instructions_da": "Vælg den korrekte ubestemmende artikel. Husk: un for hankøn, una for hunkøn.",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question_da": "Jeg ser ___ gato (en kat)",
              "options": ["un", "una", "unos", "unas"],
              "correct_answer": "un",
              "explanation_da": "Gato er hankøn, derfor 'un gato' (en kat).",
              "points": 1
            },
            {
              "id": "q2",
              "type": "multiple_choice",
              "question_da": "Hun bor i ___ casa (et hus)",
              "options": ["un", "una", "unos", "unas"],
              "correct_answer": "una",
              "explanation_da": "Casa er hunkøn, derfor 'una casa' (et hus).",
              "points": 1
            },
            {
              "id": "q3",
              "type": "multiple_choice",
              "question_da": "Han læser ___ libro (en bog)",
              "options": ["un", "una", "unos", "unas"],
              "correct_answer": "un",
              "explanation_da": "Libro er hankøn, derfor 'un libro' (en bog).",
              "points": 1
            }
          ]
        },
        ai_generated: false
      },
      {
        topic_id: 2,
        level: 'A1',
        type: 'grammar',
        title_da: 'Ser vs Estar - Grundforskellen',
        title_es: 'Ser vs Estar - Diferencia Básica',
        description_da: 'Forstå forskellen mellem permanente og midlertidige tilstande',
        description_es: 'Comprende la diferencia entre estados permanentes y temporales',
        content: {
          "instructions_da": "Vælg mellem ser og estar. Husk: ser = permanent, estar = midlertidig/placering.",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question_da": "María ___ lærer (hun arbejder som lærer)",
              "options": ["es", "está", "son", "están"],
              "correct_answer": "es",
              "explanation_da": "Lærer er hendes profession = permanent egenskab. Derfor 'es' (ser).",
              "points": 1
            },
            {
              "id": "q2",
              "type": "multiple_choice",
              "question_da": "Kaffen ___ varm (lige nu)",
              "options": ["es", "está", "son", "están"],
              "correct_answer": "está",
              "explanation_da": "Varm lige nu = midlertidig tilstand. Derfor 'está' (estar).",
              "points": 1
            },
            {
              "id": "q3",
              "type": "multiple_choice",
              "question_da": "Vi ___ hjemme (i dag)",
              "options": ["somos", "estamos", "es", "está"],
              "correct_answer": "estamos",
              "explanation_da": "Hjemme = placering/position = midlertidig. Derfor 'estamos' (estar).",
              "points": 1
            }
          ]
        },
        ai_generated: false
      }
    ];
    
    const results = [];
    
    for (let i = 0; i < sampleExercises.length; i++) {
      const exercise = sampleExercises[i];
      
      try {
        const { data, error } = await supabase
          .from('exercises')
          .insert([exercise])
          .select();

        if (error) {
          console.error(`Error inserting exercise ${i + 1}:`, error);
          
          // Check if it's a duplicate
          if (error.code === '23505') {
            results.push({ 
              exercise: i + 1, 
              skipped: true, 
              reason: 'Already exists',
              title: exercise.title_da 
            });
          } else {
            results.push({ 
              exercise: i + 1, 
              error: error.message,
              title: exercise.title_da 
            });
          }
        } else {
          results.push({ 
            exercise: i + 1, 
            success: true, 
            id: data[0]?.id,
            title: exercise.title_da 
          });
        }
      } catch (err) {
        console.error(`Exception inserting exercise ${i + 1}:`, err);
        results.push({ 
          exercise: i + 1, 
          error: (err as Error).message,
          title: exercise.title_da 
        });
      }
    }

    // Final count
    const { data: finalCount, error: countError } = await supabase
      .from('exercises')
      .select('id', { count: 'exact' });

    const successCount = results.filter(r => r.success).length;
    const skipCount = results.filter(r => r.skipped).length;
    const errorCount = results.filter(r => r.error).length;

    return NextResponse.json({
      message: 'Sample data loading completed',
      summary: {
        attempted: sampleExercises.length,
        successful: successCount,
        skipped: skipCount,
        errors: errorCount
      },
      results,
      totalExercisesInDB: finalCount?.length || 0
    });

  } catch (error) {
    console.error('Sample data loading failed:', error);
    return NextResponse.json({
      error: 'Failed to load sample data',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

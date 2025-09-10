import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    const supabase = await createClient();
    
    // Test 1: Check if we can connect and authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const result: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test Authentication
    result.tests.push({
      name: 'Authentication',
      status: authError ? 'FAILED' : user ? 'SUCCESS' : 'NO_USER',
      user: user ? { id: user.id, email: user.email } : null,
      error: authError?.message
    });

    // Test 2: Check exercises table
    try {
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, title_da, level, topic_id, ai_generated')
        .limit(5);

      result.tests.push({
        name: 'Exercises Query',
        status: exercisesError ? 'FAILED' : 'SUCCESS',
        count: exercises?.length || 0,
        data: exercises,
        error: exercisesError?.message
      });
    } catch (err) {
      result.tests.push({
        name: 'Exercises Query',
        status: 'EXCEPTION',
        error: (err as Error).message
      });
    }

    // Test 3: Check topics table
    try {
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, name_da, level')
        .limit(5);

      result.tests.push({
        name: 'Topics Query',
        status: topicsError ? 'FAILED' : 'SUCCESS',
        count: topics?.length || 0,
        data: topics,
        error: topicsError?.message
      });
    } catch (err) {
      result.tests.push({
        name: 'Topics Query',
        status: 'EXCEPTION',
        error: (err as Error).message
      });
    }

    // Test 4: Try to insert a simple exercise
    if (user) {
      try {
        const testExercise = {
          topic_id: 1,
          level: 'A1',
          type: 'test',
          title_da: 'Test Exercise - ' + Date.now(),
          title_es: 'Ejercicio de Prueba',
          description_da: 'Test exercise for debugging',
          description_es: 'Ejercicio de prueba para depuración',
          content: {
            "instructions_da": "This is a test exercise",
            "questions": [
              {
                "id": "q1",
                "type": "multiple_choice",
                "question_da": "Test question",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A",
                "explanation_da": "Test explanation",
                "points": 1
              }
            ]
          },
          ai_generated: false
        };

        const { data: insertData, error: insertError } = await supabase
          .from('exercises')
          .insert([testExercise])
          .select();

        result.tests.push({
          name: 'Insert Test Exercise',
          status: insertError ? 'FAILED' : 'SUCCESS',
          insertedId: insertData?.[0]?.id,
          error: insertError?.message
        });

        // Clean up test exercise
        if (insertData?.[0]?.id) {
          await supabase.from('exercises').delete().eq('id', insertData[0].id);
        }

      } catch (err) {
        result.tests.push({
          name: 'Insert Test Exercise',
          status: 'EXCEPTION',
          error: (err as Error).message
        });
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        error: 'Database test failed', 
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

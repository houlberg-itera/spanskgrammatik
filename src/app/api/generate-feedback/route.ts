import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFeedback } from '@/lib/openai';
import { SpanishLevel } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userAnswer, correctAnswer, question, level } = body;

    if (!userAnswer || !correctAnswer || !question || !level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate AI feedback
    const feedback = await generateFeedback(
      userAnswer,
      correctAnswer,
      question,
      level as SpanishLevel
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

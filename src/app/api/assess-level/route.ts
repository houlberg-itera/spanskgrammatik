import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { SpanishLevel } from '@/types/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { level } = body;

    if (!level) {
      return NextResponse.json({ error: 'Level is required' }, { status: 400 });
    }

    // Get user's progress for this level
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        *,
        exercises!inner (
          id,
          title_da,
          type,
          level,
          topic_id,
          topics!inner (
            name_da
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('completed', true);

    if (progressError) {
      throw progressError;
    }

    // Filter progress for the specific level
    const levelProgress = progressData?.filter((p: any) => p.exercises?.level === level) || [];
    
    // Get all exercises for this level
    const { data: allExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select(`
        id,
        title_da,
        type,
        topic_id,
        topics!inner (
          name_da
        )
      `)
      .eq('level', level);

    if (exercisesError) {
      throw exercisesError;
    }

    // Calculate statistics
    const totalExercises = allExercises?.length || 0;
    const completedExercises = levelProgress.length;
    const completionPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
    
    const averageScore = levelProgress.length > 0 
      ? levelProgress.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / levelProgress.length 
      : 0;

    // Group by topic
    const topicStats = levelProgress.reduce((acc: any, progress: any) => {
      const topicName = progress.exercises?.topics?.name_da || 'Unknown';
      if (!acc[topicName]) {
        acc[topicName] = { completed: 0, total: 0, scores: [] };
      }
      acc[topicName].completed++;
      acc[topicName].scores.push(progress.score || 0);
      return acc;
    }, {} as Record<string, { completed: number; total: number; scores: number[] }>);

    // Add total exercises per topic
    allExercises?.forEach((exercise: any) => {
      const topicName = exercise.topics?.name_da || 'Unknown';
      if (topicStats[topicName]) {
        topicStats[topicName].total = (topicStats[topicName].total || 0) + 1;
      } else {
        topicStats[topicName] = { completed: 0, total: 1, scores: [] };
      }
    });

    // Generate AI assessment
    const prompt = `Som ekspert i spansk sprogundervisning, vurder om denne studerende har gennemført niveau ${level} tilfredsstillende:

STATISTIKKER:
- Niveau: ${level}
- Øvelser gennemført: ${completedExercises} af ${totalExercises} (${completionPercentage.toFixed(1)}%)
- Gennemsnitlig score: ${averageScore.toFixed(1)}%
- Emnespecifikke resultater:
${Object.entries(topicStats).map(([topic, stats]: [string, any]) => 
  `  * ${topic}: ${stats.completed}/${stats.total} øvelser (${stats.scores.length > 0 ? stats.scores.reduce((a: number, b: number) => a + b, 0) / stats.scores.length : 0}% gennemsnit)`
).join('\n')}

NIVEAUKRAV:
${level === 'A1' ? `
- Grundlæggende hverdagssituationer
- Enkle sætninger og udtryk
- Præsens af almindelige verber
- Grundlæggende ordforråd (familie, tid, mad)
- Ser vs estar i grundlæggende situationer
` : level === 'A2' ? `
- Rutinesituationer og simple informationsudvekslinger
- Fortid (præteritum og imperfektum grundlæggende)
- Sammenlignende adjektiver
- Udvidet ordforråd (indkøb, transport, arbejde)
- Komplekse ser/estar anvendelser
` : `
- Komplekse tekster og situationer
- Alle grundlæggende tempusformer
- Konjunktiv i grundlæggende anvendelser
- Avanceret ordforråd og idiomer
- Nuanceret grammatikforståelse
`}

Giv en vurdering på dansk der:
1. Vurderer om niveauet er gennemført (JA/NEJ)
2. Identificerer styrker
3. Identificerer områder der kræver mere øvelse
4. Giver specifik feedback
5. Anbefaler næste skridt

Vær konstruktiv og realistisk. Kræv mindst 70% gennemførelse og 75% gennemsnitlig score for godkendelse.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,  // GPT-5 only supports temperature: 1
      max_completion_tokens: 1000,
    });

    const aiAssessment = completion.choices[0].message.content || 'Kunne ikke generere vurdering.';

    // Determine if level is completed
    const isCompleted = completionPercentage >= 70 && averageScore >= 75;

    return NextResponse.json({ 
      assessment: aiAssessment,
      isCompleted,
      statistics: {
        completionPercentage,
        averageScore,
        completedExercises,
        totalExercises,
        topicStats
      }
    });

  } catch (error) {
    console.error('Error generating level assessment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

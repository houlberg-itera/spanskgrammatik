import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/speech/generate-feedback
 * Generate pronunciation feedback based on transcription results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transcribed_text,
      pronunciation_score,
      accuracy_score,
      word_scores,
      language
    } = body;

    if (!transcribed_text || !language) {
      return NextResponse.json(
        { error: 'transcribed_text and language are required' },
        { status: 400 }
      );
    }

    const languageName = language === 'es' ? 'spansk' : 'portugisisk';
    const languageNative = language === 'es' ? 'español' : 'português';

    // Generate feedback based on scores
    let feedbackPrompt = `Du er en sprogindlæringslærer der giver konstruktiv feedback på ${languageName} udtale.

Eleven sagde: "${transcribed_text}"
Udtalescor: ${pronunciation_score || 'N/A'}%
Præcisionsscore: ${accuracy_score || 'N/A'}%

Giv kort, opmuntrende feedback på dansk (maks 2 sætninger). Fokuser på:
- Hvad de gjorde godt
- Ét specifikt område at forbedre hvis scoren er under 80%
- Hold tonen positiv og motiverende

Feedback på dansk:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du er en hjælpsom sprogindlæringslærer der giver kort, konstruktiv feedback.'
        },
        {
          role: 'user',
          content: feedbackPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const feedback_da = completion.choices[0]?.message?.content?.trim() || 
      'Godt forsøg! Bliv ved med at øve.';

    // Generate feedback in target language
    let nativeFeedbackPrompt = `You are a language learning teacher providing constructive feedback on ${languageNative} pronunciation.

The student said: "${transcribed_text}"
Pronunciation score: ${pronunciation_score || 'N/A'}%
Accuracy score: ${accuracy_score || 'N/A'}%

Provide brief, encouraging feedback in ${languageNative} (max 2 sentences). Focus on:
- What they did well
- One specific area to improve if score is below 80%
- Keep the tone positive and motivating

Feedback in ${languageNative}:`;

    const nativeCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful language learning teacher providing brief, constructive feedback in ${languageNative}.`
        },
        {
          role: 'user',
          content: nativeFeedbackPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const feedback = nativeCompletion.choices[0]?.message?.content?.trim() || 
      (language === 'es' ? '¡Buen intento! Sigue practicando.' : 'Boa tentativa! Continue praticando.');

    return NextResponse.json({
      feedback_da,
      feedback
    });
  } catch (error) {
    console.error('Error generating pronunciation feedback:', error);
    
    // Return fallback feedback based on score
    const score = typeof error === 'object' ? 0 : 0;
    const language = 'es'; // Fallback
    
    return NextResponse.json({
      feedback_da: 'Godt forsøg! Bliv ved med at øve.',
      feedback: language === 'es' ? '¡Buen intento! Sigue practicando.' : 'Boa tentativa! Continue praticando.'
    });
  }
}

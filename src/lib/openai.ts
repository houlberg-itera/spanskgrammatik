import OpenAI from 'openai';
import { ExerciseContent, ExerciseType, SpanishLevel } from '@/types/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry function with exponential backoff for API rate limiting
// Optimized for GPT-5 with high rate limits (500 RPM, 500K TPM)
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 8,  // Increased from 5 to 8 retries for rate limits
  baseDelay: number = 2000  // Increased from 500ms to 2000ms for rate limit recovery
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check if this is a rate limit error or "Too Many Requests"
      const isRateLimit = error?.status === 429 || 
                         error?.code === 'rate_limit_exceeded' ||
                         error?.message?.includes('Too Many Requests') ||
                         error?.message?.includes('rate_limit_exceeded') ||
                         error?.message?.includes('Rate limit');
      
      // If this is the last attempt or not a rate limit error, throw
      if (attempt === maxRetries || !isRateLimit) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter for rate limits
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 2000;  // More jitter for rate limits
      console.log(`Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export interface GenerateExerciseParams {
  level: SpanishLevel;
  topic: string;
  topicDescription: string;
  exerciseType: 'grammar' | 'vocabulary' | 'conjugation' | 'sentence_structure';
  questionCount?: number;
}

export async function generateExercise({
  level,
  topic,
  topicDescription,
  exerciseType,
  questionCount = 5,
}: GenerateExerciseParams): Promise<ExerciseContent> {
  const systemPrompt = `Du er en ekspert i spansk grammatik og sprogundervisning for danske studerende. 
Du skal generere øvelser på ${level} niveau om "${topic}".

Retningslinjer:
- Alle spørgsmål og instruktioner skal være på dansk
- Svar og forklaringer skal være på dansk, med spanske eksempler
- Tilpas sværhedsgraden til ${level} niveau
- Inkluder tydelige forklaringer for hver opgave
- Brug almindelige og relevante eksempler
- Forklaringer skal hjælpe den studerende med at forstå grammatikreglen

Generer ${questionCount} spørgsmål af typen "${exerciseType}".`;

  const userPrompt = `Generer en øvelse om "${topic}" (${topicDescription}) på ${level} niveau.

Øvelsestype: ${exerciseType}

Returner JSON i følgende format:
{
  "instructions_da": "Instruktioner på dansk",
  "questions": [
    {
      "id": "unique_id",
      "type": "question_type",
      "question_da": "Spørgsmål på dansk",
      "options": ["mulighed1", "mulighed2", "mulighed3", "mulighed4"], // kun for multiple_choice
      "correct_answer": "korrekte svar",
      "explanation_da": "Forklaring på dansk med spansk eksempel",
      "points": 1
    }
  ]
}

Spørgsmålstyper:
- multiple_choice: Valgmuligheder med ét rigtigt svar
- fill_in_blank: Udfyld den manglende del (brug ___ for blanks)
- translation: Oversættelse fra dansk til spansk eller omvendt
- conjugation: Verbumsbøjning

Eksempel på ${exerciseType} øvelse:`;

  const examples = {
    grammar: `{
      "instructions_da": "Vælg den korrekte form af verbum 'ser' eller 'estar'",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question_da": "María ___ lærer (hun er lærer som profession)",
          "options": ["es", "está", "son", "están"],
          "correct_answer": "es",
          "explanation_da": "Vi bruger 'ser' (es) for permanente egenskaber som profession. María es profesora = María er lærer (som erhverv).",
          "points": 1
        }
      ]
    }`,
    vocabulary: `{
      "instructions_da": "Oversæt følgende ord til spansk",
      "questions": [
        {
          "id": "q1",
          "type": "fill_in_blank",
          "question_da": "Dansk: 'hus' - Spansk: ___",
          "correct_answer": "casa",
          "explanation_da": "'Casa' er det almindelige ord for hus på spansk. Eksempel: Mi casa es grande (Mit hus er stort).",
          "points": 1
        }
      ]
    }`,
    conjugation: `{
      "instructions_da": "Bøj følgende verbum i præsens",
      "questions": [
        {
          "id": "q1",
          "type": "fill_in_blank",
          "question_da": "Yo ___ (hablar)",
          "correct_answer": "hablo",
          "explanation_da": "Verbum 'hablar' (at tale) bøjes til 'hablo' i 1. person ental (yo). Endelsen -ar bliver til -o for 'yo'.",
          "points": 1
        }
      ]
    }`,
    sentence_structure: `{
      "instructions_da": "Arranger de givne spanske ord til en korrekt sætning",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question_da": "Arranger følgende spanske ord til en korrekt sætning: gato, el, grande, es",
          "options": ["el gato es grande", "grande el gato es", "es el gato grande", "gato es el grande"],
          "correct_answer": "el gato es grande",
          "explanation_da": "På spansk kommer adjektivet (grande) normalt efter substantivet (gato). Korrekt rækkefølge: artikel + substantiv + verbum + adjektiv. 'El gato es grande' = Katten er stor.",
          "points": 1
        }
      ]
    }`
  };

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\n' + examples[exerciseType] },
        ],
        temperature: 1,  // GPT-5 only supports temperature: 1
        max_completion_tokens: 2000,
      });
    });

    let content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    // Robustly remove code block markers and any leading/trailing junk
    content = content.trim();
    // Remove triple backticks and optional 'json' label at start/end
    if (content.startsWith('```')) {
      content = content.replace(/^```(json)?\s*/i, '').replace(/```$/i, '').trim();
    }
    // Remove any leading/trailing newlines or whitespace
    content = content.replace(/^\s+|\s+$/g, '');
    // Remove any trailing semicolon or stray characters
    content = content.replace(/;*$/g, '');

    // If still not valid JSON, try to extract the first valid JSON object
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from within code block
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('OpenAI response is not valid JSON');
      }
    }
    const exerciseContent: ExerciseContent = parsed;
    // Validate the structure
    if (!exerciseContent.questions || !Array.isArray(exerciseContent.questions)) {
      throw new Error('Invalid exercise content structure');
    }

    return exerciseContent;
  } catch (error) {
    console.error('Error generating exercise:', error);
    throw new Error('Failed to generate exercise: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function generateFeedback(
  userAnswer: string,
  correctAnswer: string,
  question: string,
  level: SpanishLevel
): Promise<string> {
  try {
    // Simplified feedback generation with hardcoded prompts
    const systemPrompt = `Du er en hjælpsom spansk lærer, der giver feedback på dansk. Giv venlig og konstruktiv feedback til studenten på ${level} niveau.`;
    
    const userPrompt = `Spørgsmål: ${question}
Studentens svar: "${userAnswer}"
Korrekt svar: "${correctAnswer}"

Giv kort feedback på dansk om studentens svar.`;

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });
    });

    return completion.choices[0].message.content || 'Feedback kunne ikke genereres.';
  } catch (error) {
    console.error('Error generating feedback:', error);
    return 'Feedback kunne ikke genereres på grund af en fejl.';
  }
}

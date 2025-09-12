import OpenAI from 'openai';
import { ExerciseContent, ExerciseType, SpanishLevel } from '@/types/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry function with exponential backoff for API rate limiting
// Uses dynamic configuration for retry settings
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retryConfig: { maxRetries: number; baseDelay: number }
): Promise<T> {
  const { maxRetries, baseDelay } = retryConfig;
  
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
      "instructions_da": "Arranger ordene til en korrekt spansk sætning",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question_da": "Arranger: 'gato / el / grande / es'",
          "options": ["el gato es grande", "grande el gato es", "es el gato grande", "gato es el grande"],
          "correct_answer": "el gato es grande",
          "explanation_da": "På spansk kommer adjektivet (grande) normalt efter substantivet (gato). Korrekt rækkefølge: artikel + substantiv + verbum + adjektiv.",
          "points": 1
        }
      ]
    }`
  };

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\n' + examples[exerciseType] },
        ],
        temperature: 0.7,  // Optimized for consistency and speed
        max_completion_tokens: 1500,  // Reduced for faster generation
      });
    }, { maxRetries: 3, baseDelay: 1000 });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    const exerciseContent: ExerciseContent = JSON.parse(content);
    
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
  const prompt = `Som spansklærer for danske studerende på ${level} niveau, giv konstruktiv feedback på denne besvarelse:

Spørgsmål: ${question}
Studerendes svar: ${userAnswer}
Korrekte svar: ${correctAnswer}

Giv feedback på dansk der:
1. Forklarer om svaret er korrekt eller forkert
2. Forklarer hvorfor (grammatikregel, betydning, etc.)
3. Giver et hjælpsomt tip til fremtiden
4. Er opmuntrende og konstruktiv

Hold feedbacken kort (max 2-3 sætninger) og på begyndervenligt sprog.`;

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,  // Optimized for consistency
        max_completion_tokens: 150,  // Reduced for faster feedback generation
      });
    }, { maxRetries: 3, baseDelay: 1000 });

    return completion.choices[0].message.content || 'Feedback kunne ikke genereres.';
  } catch (error) {
    console.error('Error generating feedback:', error);
    return 'Feedback kunne ikke genereres på grund af en fejl.';
  }
}

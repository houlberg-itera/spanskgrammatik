import OpenAI from 'openai';
import { ExerciseContent, QuestionType, SpanishLevel } from '@/types/database';
import { getAIConfiguration, replaceTemplateVariables } from './ai-config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry function with exponential backoff for API rate limiting
// Uses dynamic configuration for retry settings
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retryConfig: { maxRetries: number; baseDelay: number }
): Promise<T> {
  console.log(`🔄 Starting retry function with maxRetries: ${retryConfig.maxRetries}, baseDelay: ${retryConfig.baseDelay}ms`);
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`🎯 Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
      const result = await fn();
      console.log(`✅ Attempt ${attempt + 1} successful`);
      return result;
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt + 1} failed:`, {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      
      // Check if this is a rate limit error or "Too Many Requests"
      const isRateLimit = error?.status === 429 || 
                         error?.code === 'rate_limit_exceeded' ||
                         error?.message?.includes('Too Many Requests') ||
                         error?.message?.includes('rate_limit_exceeded') ||
                         error?.message?.includes('Rate limit');
      
      console.log(`🔍 Is rate limit error: ${isRateLimit}`);
      
      // If this is the last attempt or not a rate limit error, throw
      if (attempt === retryConfig.maxRetries || !isRateLimit) {
        console.error(`❌ Final failure - throwing error. Last attempt: ${attempt === retryConfig.maxRetries}, Rate limit: ${isRateLimit}`);
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter for rate limits
      const delay = retryConfig.baseDelay * Math.pow(2, attempt) + Math.random() * 2000;  // More jitter for rate limits
      console.log(`⏳ Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export interface AdvancedGenerateExerciseParams {
  level: SpanishLevel;
  topic: string;
  topicDescription: string;
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation' | 'conjugation' | 'sentence_structure';
  questionCount?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  existingQuestions?: string[];
  generateVariations?: boolean;
  includeExplanations?: boolean;
  targetProficiency?: boolean;
}

interface ProficiencyIndicator {
  skill: string;
  description: string;
  difficulty_level: string;
}

interface EnhancedExerciseContent extends ExerciseContent {
  metadata?: {
    topic_coverage: string[];
    proficiency_indicators: ProficiencyIndicator[];
    cognitive_load: 'low' | 'medium' | 'high';
    assessment_validity: number; // 0-1 score
  };
}

const DIFFICULTY_GUIDELINES = {
  A1: {
    easy: 'Grundlæggende ordforråd og simple strukturer. Enkle sætninger med "ser" og "estar".',
    medium: 'Almindelige hverdagsudtryk og grundlæggende grammatiske mønstre.',
    hard: 'Introduktion til mere komplekse strukturer, men stadig inden for A1-niveau.'
  },
  A2: {
    easy: 'Almindelige situationer og kendte emner. Simple fortid og fremtid.',
    medium: 'Komplekse situationer, uregelmæssige verbum, komparativer.',
    hard: 'Avancerede A2-strukturer der forbereder til B1-niveau.'
  },
  B1: {
    easy: 'Almindelige komplekse strukturer, subjunktiv i enkle tilfælde.',
    medium: 'Avanceret grammatik, forskellige subjunktiv-anvendelser.',
    hard: 'Komplekse strukturer der kræver dyb forståelse af spansk grammatik.'
  }
};

export async function generateAdvancedExercise({
  level,
  topic,
  topicDescription,
  exerciseType,
  questionCount = 8,
  difficulty,
  existingQuestions = [],
  generateVariations = true,
  includeExplanations = true,
  targetProficiency = true,
}: AdvancedGenerateExerciseParams): Promise<EnhancedExerciseContent> {
  console.log('🤖 OpenAI Advanced: Starting exercise generation...');
  console.log('📋 Parameters:', {
    level,
    topic,
    topicDescription,
    exerciseType,
    questionCount,
    difficulty,
    existingQuestionsCount: existingQuestions.length,
    generateVariations,
    includeExplanations,
    targetProficiency
  });

  // Get dynamic AI configuration
  const config = await getAIConfiguration('bulk_generation');

  // Prepare template variables for the dynamic prompts
  const templateVars = {
    level,
    topic,
    topicDescription,
    exerciseType,
    questionCount,
    difficulty
  };

  // Replace variables in prompts
  const systemPrompt = replaceTemplateVariables(config.system_prompt, templateVars);
  const userPrompt = replaceTemplateVariables(config.user_prompt_template, templateVars);

  // Build enhanced prompt with difficulty guidelines and existing questions
  const difficultyGuide = DIFFICULTY_GUIDELINES[level]?.[difficulty] || 'Standard difficulty';
  const existingQuestionsText = existingQuestions.length > 0 
    ? `\nUNDGÅ DISSE EKSISTERENDE SPØRGSMÅL:\n${existingQuestions.slice(0, 10).map(q => `- "${q}"`).join('\n')}`
    : '';

  const enhancedSystemPrompt = `${systemPrompt}

NIVEAU RETNINGSLINJER (${level}):
${difficultyGuide}

KVALITETSKRAV:
1. Alle instruktioner og forklaringer på dansk
2. Spanske eksempler med dansk forklaring
3. Progressiv sværhedsgrad inden for ${difficulty}-kategorien
4. Varierede kontekster og situationer
5. Undgå gentagelse af eksisterende spørgsmål
${existingQuestionsText}`;

  const enhancedUserPrompt = `${userPrompt}

Returner KUN valid JSON i dette format:
{
  "instructions_da": "Detaljerede instruktioner på dansk",
  "questions": [
    {
      "id": "q1",
      "type": "${exerciseType}",
      "question_da": "Spørgsmål på dansk",
      ${exerciseType === 'multiple_choice' ? `"options": ["option1", "option2", "option3", "option4"],` : ''}
      "correct_answer": "korrekt svar",
      "explanation_da": "Detaljeret forklaring på dansk med spansk eksempel",
      "difficulty_level": "${difficulty}",
      "proficiency_indicator": "hvilket niveau-mål dette spørgsmål tester",
      "points": 1
    }
  ],
  "metadata": {
    "topic_coverage": ["emne1", "emne2", "emne3"],
    "proficiency_indicators": [
      {
        "skill": "færdighed",
        "description": "beskrivelse af hvad der testes",
        "difficulty_level": "${difficulty}"
      }
    ],
    "cognitive_load": "low",
    "assessment_validity": 0.85
  }
}`;

  console.log('🔄 Preparing OpenAI API call...');
  console.log('📝 System prompt length:', enhancedSystemPrompt.length);
  console.log('📝 User prompt length:', enhancedUserPrompt.length);

  try {
    console.log(`🌐 Making OpenAI API call with model: ${config.model_name}`);
    const completion = await retryWithBackoff(async () => {
      console.log('🔄 Attempting OpenAI API call...');
      return await openai.chat.completions.create({
        model: config.model_name,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: enhancedUserPrompt }
        ],
        temperature: config.temperature,
        max_completion_tokens: config.max_tokens,
      });
    }, config.retry_config);

    console.log('✅ OpenAI API call successful');
    console.log('📊 Usage:', completion.usage);

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent || responseContent.trim().length === 0) {
      console.error('❌ No response content from OpenAI');
      throw new Error('No response from OpenAI');
    }

    console.log('📝 Raw response length:', responseContent.length);

    // Clean up response and parse JSON
    const cleanedResponse = responseContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let exerciseContent: EnhancedExerciseContent;
    try {
      console.log('🔄 Parsing JSON response...');
      exerciseContent = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw response that failed to parse:', responseContent);
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }

    console.log('✅ JSON parsing successful');
    console.log('📊 Generated questions count:', exerciseContent.questions?.length || 0);

    // Validate and enhance the response
    if (!exerciseContent.questions || exerciseContent.questions.length === 0) {
      console.error('❌ No questions generated in response:', exerciseContent);
      throw new Error(`No questions generated. Expected ${questionCount} questions.`);
    }

    // Add IDs and ensure required fields
    exerciseContent.questions = exerciseContent.questions.map((q, index) => ({
      ...q,
      id: q.id || `q${index + 1}`,
      difficulty_level: q.difficulty_level || difficulty,
      proficiency_indicator: q.proficiency_indicator || `${level} level skill assessment`,
      points: q.points || 1
    }));

    // Ensure metadata exists
    if (!exerciseContent.metadata) {
      exerciseContent.metadata = {
        topic_coverage: [topic],
        proficiency_indicators: [{
          skill: topic,
          description: `Assessment of ${topic} knowledge at ${level} level`,
          difficulty_level: difficulty
        }],
        cognitive_load: difficulty === 'easy' ? 'low' : difficulty === 'medium' ? 'medium' : 'high',
        assessment_validity: 0.85
      };
    }

    console.log('✅ Advanced exercise generation completed successfully');
    return exerciseContent;

  } catch (error) {
    console.error('❌ Error generating advanced exercise:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      status: (error as any)?.status,
      code: (error as any)?.code,
      type: (error as any)?.type
    });
    throw new Error(`Failed to generate exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function validateExerciseQuality(exercise: EnhancedExerciseContent): Promise<{
  score: number;
  feedback: string[];
  recommendations: string[];
}> {
  const feedback: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check question variety
  const questionTypes = new Set(exercise.questions.map(q => q.type));
  if (questionTypes.size === 1 && exercise.questions.length > 5) {
    score -= 10;
    feedback.push('Mangler variation i spørgsmålstyper');
    recommendations.push('Tilføj forskellige spørgsmålstyper for bedre vurdering');
  }

  // Check explanation quality
  const avgExplanationLength = exercise.questions.reduce((sum, q) => 
    sum + (q.explanation_da?.length || 0), 0) / exercise.questions.length;
  if (avgExplanationLength < 50) {
    score -= 20;
    feedback.push('Forklaringer er for korte');
    recommendations.push('Uddyb forklaringerne med eksempler og grammatiske regler');
  }

  return {
    score: Math.max(0, score),
    feedback,
    recommendations
  };
}
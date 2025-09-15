import OpenAI from 'openai';
import { ExerciseContent, QuestionType, SpanishLevel } from '@/types/database';

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
  console.log(`🔄 Starting retry function with maxRetries: ${maxRetries}, baseDelay: ${baseDelay}ms`);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎯 Attempt ${attempt + 1}/${maxRetries + 1}`);
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
      if (attempt === maxRetries || !isRateLimit) {
        console.error(`❌ Final failure - throwing error. Last attempt: ${attempt === maxRetries}, Rate limit: ${isRateLimit}`);
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter for rate limits
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 2000;  // More jitter for rate limits
      console.log(`⏳ Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
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
  model?: string; // OpenAI model to use (e.g., 'gpt-4o', 'gpt-5')
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

const EXERCISE_TYPE_PROMPTS = {
  multiple_choice: {
    structure: 'Flervalgsspørgsmål med 4 svarmuligheder hvor kun én er korrekt.',
    assessment: 'Test forståelse af grammatiske regler og ordforråd gennem kontekst.',
    tips: 'Gør distraktorerne plausible men klart forkerte. Undgå åbenlyse forkerte svar.'
  },
  fill_blank: {
    structure: 'Sætninger med tomme pladser der skal udfyldes med det korrekte ord eller bøjning.',
    assessment: 'Test aktiv anvendelse af grammatik og ordforråd.',
    tips: 'Giv kun ét klart korrekt svar. Undgå tvetydige kontekster. Brug _ til at markere tomme pladser. Inkluder tilstrækkelig kontekst.'
  },
  translation: {
    structure: 'Oversættelse fra dansk til spansk eller omvendt.',
    assessment: 'Test forståelse af både sprog og kulturelle nuancer.',
    tips: 'Brug naturlige sætninger som kunne forekomme i virkelige situationer.'
  },
  conjugation: {
    structure: 'Verbum der skal bøjes i den korrekte form baseret på kontekst.',
    assessment: 'Test beherskelse af verbbøjninger og tid/modus valg.',
    tips: 'Inkluder kontekst der klart indikerer den ønskede tid og modus.'
  },
  sentence_structure: {
    structure: 'Omstrukturering af sætninger eller ordorganisering.',
    assessment: 'Test forståelse af spansk syntaks og sætningsopbygning.',
    tips: 'Fokuser på almindelige fejl som danske studerende laver.'
  }
};

const PROFICIENCY_INDICATORS = {
  A1: [
    'Kan forstå og bruge grundlæggende udtryk',
    'Kan præsentere sig selv og andre',
    'Kan stille og besvare spørgsmål om personlige forhold',
    'Kan skelne mellem "ser" og "estar"',
    'Kan bruge grundlæggende substantiver og adjektiver'
  ],
  A2: [
    'Kan kommunikere om rutineopgaver',
    'Kan beskrive sin baggrund og umgivelser',
    'Kan bruge datid og fremtid',
    'Kan håndtere uregelmæssige verbum',
    'Kan bruge komparativer og superlativer'
  ],
  B1: [
    'Kan håndtere de fleste situationer på rejser',
    'Kan udtrykke holdninger og begrunde synspunkter',
    'Kan bruge subjunktiv i almindelige tilfælde',
    'Kan forstå og bruge betinget modus',
    'Kan konstruere komplekse sætninger'
  ]
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
  model = 'gpt-4o', // Default to GPT-4o if not specified
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
    targetProficiency,
    model
  });

  // GPT-5 reasoning token retry logic - reduce question count on reasoning token issues
  const maxQuestionReductions = 3;
  let currentQuestionCount = questionCount;
  
  for (let reduction = 0; reduction <= maxQuestionReductions; reduction++) {
    try {
      console.log(`🎯 Attempting generation with ${currentQuestionCount} questions (reduction attempt ${reduction})`);
      
      return await generateAdvancedExerciseInternal({
        level,
        topic,
        topicDescription,
        exerciseType,
        questionCount: currentQuestionCount,
        difficulty,
        existingQuestions,
        generateVariations,
        includeExplanations,
        targetProficiency,
        model
      });
      
    } catch (error: any) {
      const isReasoningTokenIssue = error.isReasoningTokenIssue || error.message?.includes('GPT-5 used reasoning tokens but returned no content');
      
      if (isReasoningTokenIssue && reduction < maxQuestionReductions) {
        // Reduce question count by half and try again
        currentQuestionCount = Math.max(1, Math.floor(currentQuestionCount / 2));
        console.log(`⚠️ GPT-5 reasoning token issue detected. Reducing question count to ${currentQuestionCount} and retrying...`);
        continue;
      }
      
      // If not a reasoning token issue or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  throw new Error('Failed to generate exercises even with reduced question count');
}

async function generateAdvancedExerciseInternal({
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
  model = 'gpt-4o',
}: AdvancedGenerateExerciseParams): Promise<EnhancedExerciseContent> {

  // Check OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is not set');
    throw new Error('OpenAI API key is not configured');
  }
  console.log('✅ OpenAI API key is configured');

  // Validate required parameters
  if (!level || !difficulty || !topic || !exerciseType) {
    console.error('❌ Missing required parameters:', { level, difficulty, topic, exerciseType });
    throw new Error(`Missing required parameters: level=${level}, difficulty=${difficulty}, topic=${topic}, exerciseType=${exerciseType}`);
  }

  // Special handling for problematic combinations
  if (topic.toLowerCase().includes('komplekse sætningsstrukturer') && exerciseType === 'fill_blank') {
    console.log('⚠️ Detected problematic combination: Complex sentence structures + fill_blank');
    console.log('🔄 Converting to multiple_choice for better results');
    
    // Change the exercise type to multiple_choice for complex sentence structures
    exerciseType = 'multiple_choice';
    
    // Update the user prompt to reflect this change
    console.log('✅ Converted fill_blank to multiple_choice for complex sentence structures');
  }

  // Validate level and difficulty exist in our guidelines
  if (!DIFFICULTY_GUIDELINES[level]) {
    console.error(`❌ Invalid level: ${level}`);
    throw new Error(`Invalid level: ${level}. Must be one of: ${Object.keys(DIFFICULTY_GUIDELINES).join(', ')}`);
  }

  if (!DIFFICULTY_GUIDELINES[level][difficulty]) {
    console.error(`❌ Invalid difficulty "${difficulty}" for level "${level}"`);
    throw new Error(`Invalid difficulty "${difficulty}" for level "${level}". Must be one of: ${Object.keys(DIFFICULTY_GUIDELINES[level]).join(', ')}`);
  }

  if (!EXERCISE_TYPE_PROMPTS[exerciseType]) {
    console.error(`❌ Invalid exercise type: ${exerciseType}`);
    throw new Error(`Invalid exercise type: ${exerciseType}. Must be one of: ${Object.keys(EXERCISE_TYPE_PROMPTS).join(', ')}`);
  }

  console.log('✅ All parameters validated successfully');

  const difficultyGuide = DIFFICULTY_GUIDELINES[level][difficulty];
  const exerciseTypeInfo = EXERCISE_TYPE_PROMPTS[exerciseType];
  const proficiencyTargets = PROFICIENCY_INDICATORS[level];

  // Special enhanced prompts for complex sentence structures
  let additionalPromptForComplexStructures = '';
  if (topic.toLowerCase().includes('komplekse sætningsstrukturer') || topic.toLowerCase().includes('complex')) {
    additionalPromptForComplexStructures = `
SÆRLIGE RETNINGSLINJER FOR KOMPLEKSE SÆTNINGSSTRUKTURER:
- Fokuser på relative sætninger (que, quien, donde, cuando)
- Inkluder konjunktioner (aunque, para que, sin que, después de que)
- Test forståelse af sætningsopbygning og ordstilling
- Brug eksempler med subordinerede sætninger
- Fokuser på forskelle mellem dansk og spansk sætningsstruktur
- Inkluder både sammensatte og komplekse sætninger
- Test korrekt brug af konjunktiv i underordnede sætninger

EKSEMPLER PÅ GODE KOMPLEKSE SÆTNINGSSTRUKTUR ØVELSER:
1. Relative sætninger: "La casa que compramos es muy grande"
2. Betingede sætninger: "Si tuviera dinero, viajaría"
3. Tidssætninger: "Cuando llegue a casa, cocinaré"
4. Årsagssætninger: "Como estaba cansado, me fui a dormir"
5. Formålssætninger: "Estudio para que mis padres estén orgullosos"

UNDGÅ disse almindelige problemer:
- Alt for komplekse sætninger for niveauet
- Tvetydige strukturer hvor flere ordstillinger kunne være korrekte
- Kulturspecifikke udtryk som danske elever ikke kender
`;
  }

  const systemPrompt = `Du er en ekspert i spansk grammatik og sprogpædagogik med speciale i at skabe valide proficienstests for danske studerende.

OPGAVE: Generer ${questionCount} ${exerciseType} øvelser på ${level}-niveau om "${topic}" med ${difficulty} sværhedsgrad.

NIVEAU RETNINGSLINJER (${level}):
${difficultyGuide}

ØVELSESTYPE (${exerciseType}):
- Struktur: ${exerciseTypeInfo.structure}
- Vurdering: ${exerciseTypeInfo.assessment}
- Tips: ${exerciseTypeInfo.tips}

PROFICIENSKRAV (${level}):
${proficiencyTargets.map(indicator => `- ${indicator}`).join('\n')}

KVALITETSKRAV:
1. Alle instruktioner og forklaringer på dansk
2. KRITISK: Brug RENE SPANSKE SÆTNINGER i øvelser - ingen blanding af dansk og spansk
3. ALDRIG bland sprog i samme sætning (fx "Jeg har købt _ casa i Spanien" ❌)
4. Korrekt format: Dansk instruktion + Rent spansk øvelsesindhold (fx "He comprado _ casa en España" ✅)
5. Progressiv sværhedsgrad inden for ${difficulty}-kategorien
6. Varierede kontekster og situationer
7. Kulturelt relevante eksempler
8. Undgå gentagelse af eksisterende spørgsmål
9. Inkluder distraktoranalyse for multiple choice
10. Pedagogisk progression mellem spørgsmål
11. For fill_blank: Brug _ til tomme pladser og sørg for ét entydigt svar
12. KRAV: Generer MINDST ${questionCount} komplette, valide spørgsmål

SPROGADSKILLELSE EKSEMPLER:
❌ FORKERT: "Hvilken artikel passer til substantivet 'casa' i sætningen: Jeg har købt _ casa i Spanien?"
✅ KORREKT: Instruktion: "Vælg den korrekte artikel til følgende spanske sætning:" + Øvelse: "He comprado _ casa en España"

EKSEMPLER PÅ KORREKTE FILL_BLANK ØVELSER:
✅ KORREKT format for fill_blank:
{
  "id": "fb1",
  "type": "fill_blank",
  "question_da": "Udfyld den tomme plads med den korrekte verbform: María _ (hablar) español muy bien.",
  "correct_answer": "habla",
  "explanation_da": "Vi bruger 'habla' fordi det er 3. person ental af verbet 'hablar' i præsens.",
  "difficulty_level": "easy"
}

✅ KORREKT format for fill_blank (artikel):
{
  "id": "fb2", 
  "type": "fill_blank",
  "question_da": "Udfyld med den korrekte artikel: Tengo _ perro muy inteligente.",
  "correct_answer": "un",
  "explanation_da": "Vi bruger 'un' fordi 'perro' er maskulint og bestemt artikel i entalsform.",
  "difficulty_level": "medium"
}

UNDGÅ DISSE EKSISTERENDE SPØRGSMÅL:
${existingQuestions.slice(0, 10).map(q => `- "${q}"`).join('\n')}

${additionalPromptForComplexStructures}

EKSEMPEL PÅ GOD PROGRESSION:
- Spørgsmål 1-3: Introducer konceptet
- Spørgsmål 4-6: Øg kompleksiteten
- Spørgsmål 7-8: Test dyb forståelse og anvendelse`;

  const userPrompt = `Generer NØJAGTIGT ${questionCount} ${exerciseType} øvelser om "${topic}" (${topicDescription}).

Niveau: ${level}
Sværhedsgrad: ${difficulty}
Focus: Proficienstest der kan vurdere elevens beherskelse af emnet

KRITISKE KRAV:
- Du SKAL generere præcis ${questionCount} komplette, funktionelle spørgsmål
- Hvert spørgsmål SKAL have alle påkrævede felter udfyldt
- For fill_blank: Brug NØJAGTIGT ÉN _ i question_da og giv ÉT entydigt svar i correct_answer
- For multiple_choice: Inkluder 4 realistiske svarmuligheder
- Alle forklaringer skal være detaljerede og pædagogiske på dansk
${exerciseType === 'fill_blank' ? `
SÆRLIGE KRAV FOR FILL_BLANK:
- question_da SKAL indeholde nøjagtigt én _ (underscore) som markerer den tomme plads
- correct_answer SKAL være et enkelt ord eller kort udtryk (maks 3 ord)
- Konteksten skal gøre svaret entydigt
- Undgå tvetydige sætninger hvor flere svar kunne være korrekte
` : ''}

Returner KUN valid JSON i dette format:
{
  "instructions_da": "Detaljerede instruktioner på dansk",
  "questions": [
    {
      "id": "q1",
      "type": "${exerciseType}",
      "question_da": "Spørgsmål på dansk${exerciseType === 'fill_blank' ? ' med _ for tomme pladser' : ''}",
      ${exerciseType === 'multiple_choice' ? `"options": ["option1", "option2", "option3", "option4"],` : ''}
      "correct_answer": "${exerciseType === 'fill_blank' ? 'enkelt ord eller kort udtryk' : 'korrekt svar'}",
      "explanation_da": "Detaljeret forklaring på dansk med spansk eksempel",
      "difficulty_level": "${difficulty}",
      "proficiency_indicator": "hvilket niveau-mål dette spørgsmål tester"
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
    "cognitive_load": "low|medium|high",
    "assessment_validity": 0.85
  }
}

HUSK: Du skal generere ${questionCount} spørgsmål - ingen mere, ingen mindre. Fokuser på variation og autenticitet.`;

  console.log('🔄 Preparing OpenAI API call...');
  console.log('📝 System prompt length:', systemPrompt.length);
  console.log('📝 User prompt length:', userPrompt.length);

  try {
    console.log(`🌐 Making OpenAI API call with model: ${model}`);
    const completion = await retryWithBackoff(async () => {
      console.log('🔄 Attempting OpenAI API call...');
      return await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: model === 'gpt-5' ? 1 : 0.7,  // GPT-5 only supports temperature: 1, others can use 0.7
        max_completion_tokens: model === 'gpt-5' ? 4000 : 3000,  // Higher token limit for GPT-5
      });
    });

    console.log('✅ OpenAI API call successful');
    console.log('📊 Usage:', completion.usage);

    const responseContent = completion.choices[0]?.message?.content;
    
    // Handle case where GPT-5 uses reasoning tokens but returns empty content
    if (!responseContent || responseContent.trim().length === 0) {
      console.error('❌ No response content from OpenAI');
      console.error('📊 Completion details:', {
        choice: completion.choices[0],
        finish_reason: completion.choices[0]?.finish_reason,
        usage: completion.usage
      });
      
      // If this used reasoning tokens but no content, it might be a GPT-5 issue
      if (completion.usage?.completion_tokens_details?.reasoning_tokens > 0) {
        console.error('⚠️ GPT-5 used reasoning tokens but returned no content - this may be a model issue');
        const error = new Error('GPT-5 used reasoning tokens but returned no content. Try reducing prompt complexity or question count.');
        (error as any).isReasoningTokenIssue = true;  // Add flag for wrapper to detect
        throw error;
      }
      
      throw new Error('No response from OpenAI');
    }

    console.log('📝 Raw response length:', responseContent.length);
    console.log('📝 Raw response preview:', responseContent.substring(0, 200) + '...');

    // Clean up response and parse JSON
    const cleanedResponse = responseContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('🧹 Cleaned response length:', cleanedResponse.length);
    console.log('🧹 Cleaned response preview:', cleanedResponse.substring(0, 200) + '...');

    let exerciseContent: EnhancedExerciseContent;
    try {
      console.log('🔄 Parsing JSON response...');
      exerciseContent = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw response that failed to parse:', responseContent);
      console.error('❌ Cleaned response that failed to parse:', cleanedResponse);
      throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
    }

    console.log('✅ JSON parsing successful');
    console.log('📊 Generated questions count:', exerciseContent.questions?.length || 0);

    // Validate and enhance the response
    if (!exerciseContent.questions || exerciseContent.questions.length === 0) {
      console.error('❌ No questions generated in response:', exerciseContent);
      throw new Error(`No questions generated. Expected ${questionCount} questions.`);
    }

    if (exerciseContent.questions.length < questionCount) {
      console.warn(`⚠️ Generated ${exerciseContent.questions.length} questions, expected ${questionCount}`);
    } else {
      console.log(`✅ Generated ${exerciseContent.questions.length} questions as requested`);
    }

    // Add IDs and ensure required fields
    exerciseContent.questions = exerciseContent.questions.map((q, index) => ({
      ...q,
      id: q.id || `q${index + 1}`,
      difficulty_level: q.difficulty_level || difficulty,
      proficiency_indicator: q.proficiency_indicator || `${level} level skill assessment`
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
      topic,
      exerciseType,
      level,
      difficulty
    });

    // Special handling for complex sentence structures
    if (topic.toLowerCase().includes('komplekse sætningsstrukturer') || topic.toLowerCase().includes('complex')) {
      console.log('❌ Complex sentence structure generation failed');
      
      // Provide a helpful fallback with pre-made examples
      const fallbackContent: EnhancedExerciseContent = {
        instructions_da: "Disse øvelser fokuserer på komplekse sætningsstrukturer i spansk. Vælg det korrekte svar for hver sætning.",
        questions: [
          {
            id: "fallback1",
            type: "multiple_choice",
            question_da: "Vælg den korrekte relative pronomen: La casa _ compramos es muy grande.",
            options: ["que", "quien", "donde", "cuando"],
            correct_answer: "que",
            explanation_da: "Vi bruger 'que' fordi det refererer til en ting (casa). 'Quien' bruges kun om personer.",
            difficulty_level: difficulty,
            proficiency_indicator: "Relative pronouns in complex sentences"
          },
          {
            id: "fallback2", 
            type: "multiple_choice",
            question_da: "Hvilken konjunktion passer bedst: Estudiaré _ mis padres estén contentos.",
            options: ["para que", "porque", "cuando", "si"],
            correct_answer: "para que",
            explanation_da: "'Para que' bruges til at udtrykke formål og kræver konjunktiv (estén). Det betyder 'så at' eller 'for at'.",
            difficulty_level: difficulty,
            proficiency_indicator: "Purpose clauses with subjunctive"
          }
        ],
        metadata: {
          topic_coverage: ["relative clauses", "subordinate clauses", "complex syntax"],
          proficiency_indicators: [{
            skill: "Complex sentence structures",
            description: "Understanding of advanced Spanish syntax patterns",
            difficulty_level: difficulty
          }],
          cognitive_load: "high",
          assessment_validity: 0.80
        }
      };
      
      console.log('✅ Returning fallback content for complex sentence structures');
      return fallbackContent;
    }

    throw error;
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

  // Check difficulty progression
  const difficulties = exercise.questions.map(q => q.difficulty_level);
  const hasProgression = difficulties.some((d, i) => i > 0 && d !== difficulties[i-1]);
  if (!hasProgression && exercise.questions.length > 4) {
    score -= 15;
    feedback.push('Mangler sværhedsgrad progression');
    recommendations.push('Tilføj gradvis stigning i sværhedsgrad');
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

import OpenAI from 'openai';
import { ExerciseContent, ExerciseType, SpanishLevel } from '@/types/database';
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

export async function generateExercise(params: GenerateExerciseParams): Promise<ExerciseContent> {
  const { level, topic, topicDescription, exerciseType, questionCount = 5 } = params;

  // Get dynamic AI configuration
  const config = await getAIConfiguration('exercise_generation');

  // Prepare template variables
  const templateVars = {
    level,
    topic,
    topicDescription,
    exerciseType,
    questionCount
  };

  // Replace variables in prompts
  const systemPrompt = replaceTemplateVariables(config.system_prompt, templateVars);
  const userPrompt = replaceTemplateVariables(config.user_prompt_template, templateVars);

  // Get example for this exercise type
  const exampleContent = config.examples[exerciseType] || '';
  const exampleText = typeof exampleContent === 'string' 
    ? exampleContent 
    : JSON.stringify(exampleContent, null, 2);

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: config.model_name,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\n' + exampleText },
        ],
        temperature: config.temperature,
        max_completion_tokens: config.max_tokens,
      });
    }, config.retry_config);

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
  // Get dynamic AI configuration for feedback
  const config = await getAIConfiguration('feedback_generation');

  // Prepare template variables
  const templateVars = {
    userAnswer,
    correctAnswer,
    question,
    level
  };

  // Replace variables in prompts
  const systemPrompt = replaceTemplateVariables(config.system_prompt, templateVars);
  const userPrompt = replaceTemplateVariables(config.user_prompt_template, templateVars);

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: config.model_name,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.temperature,
        max_completion_tokens: config.max_tokens,
      });
    }, config.retry_config);

    return completion.choices[0].message.content || 'Feedback kunne ikke genereres.';
  } catch (error) {
    console.error('Error generating feedback:', error);
    return 'Feedback kunne ikke genereres på grund af en fejl.';
  }
}
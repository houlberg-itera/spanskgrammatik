import { createClient } from '@/lib/supabase/server';

interface AIConfiguration {
  id: number;
  name: string;
  description: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reasoning_instructions?: string; // Optional: Custom instructions for reasoning models (GPT-5, o1). Falls back to hardcoded default if not provided.
}

/**
 * Fetches AI configuration by name from the database
 * @param configName - Name of the configuration (e.g., 'bulk_generation', 'exercise_generation', 'feedback_generation')
 * @returns Promise<AIConfiguration | null>
 */
export async function getAIConfiguration(configName: string): Promise<AIConfiguration | null> {
  try {
    console.log(`🔍 [AI-Config] Fetching configuration: ${configName}`);
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('name', configName)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`❌ [AI-Config] Error fetching ${configName}:`, error);
      return null;
    }

    if (!data) {
      console.warn(`⚠️ [AI-Config] No active configuration found for: ${configName}`);
      return null;
    }

    console.log(`✅ [AI-Config] Found configuration: ${configName} -> ${data.model_name} (temp: ${data.temperature}, max_tokens: ${data.max_tokens})`);
    return data;
  } catch (error) {
    console.error(`❌ [AI-Config] Unexpected error fetching ${configName}:`, error);
    return null;
  }
}

/**
 * Gets AI configuration with fallback defaults
 * @param configName - Name of the configuration
 * @returns Promise with configuration data or defaults
 */
export async function getAIConfigurationWithDefaults(configName: string) {
  const config = await getAIConfiguration(configName);
  
  if (config) {
    return {
      model: config.model_name,
      temperature: config.temperature,
      maxTokens: config.max_tokens,
      systemPrompt: config.system_prompt,
      userPromptTemplate: config.user_prompt_template,
      reasoningInstructions: config.reasoning_instructions,
      configFound: true,
      configName: config.name
    };
  }

  // Default configurations based on the config name
  const defaults = {
    'bulk_generation': {
      model: 'gpt-4o',
      temperature: 1,
      maxTokens: 2000,
      systemPrompt: 'You are an expert {{languageNameDa}} ({{languageNativeName}}) language teacher creating educational exercises for Danish students.',
      userPromptTemplate: 'Generate {count} {exerciseType} exercises for {level} level on topic: {topic} in {{languageNameDa}} (code: {{targetLanguage}})',
      reasoningInstructions: undefined, // Will use hardcoded default if undefined
      configFound: false,
      configName: 'default_bulk_generation'
    },
    'exercise_generation': {
      model: 'gpt-4o',
      temperature: 1,
      maxTokens: 1500,
      systemPrompt: 'You are a Spanish language teacher creating individual exercises.',
      userPromptTemplate: 'Create a {exerciseType} exercise for {level} level on: {topic}',
      reasoningInstructions: undefined, // Will use hardcoded default if undefined
      configFound: false,
      configName: 'default_exercise_generation'
    },
    'vocabulary_generation': {
      model: 'gpt-4o',
      temperature: 1,
      maxTokens: 1800,
      systemPrompt: 'You are a Spanish vocabulary teacher creating exercises for Danish students.',
      userPromptTemplate: 'Generate {count} vocabulary exercises about {topic} for {level} level',
      reasoningInstructions: undefined, // Will use hardcoded default if undefined
      configFound: false,
      configName: 'default_vocabulary_generation'
    }
  };

  const fallback = defaults[configName as keyof typeof defaults] || defaults['exercise_generation'];
  console.log(`🔄 [AI-Config] Using fallback defaults for: ${configName}`);
  
  return fallback;
}

/**
 * Creates OpenAI API parameters with model-specific token parameter
 * @param model - The OpenAI model name
 * @param maxTokens - Maximum number of tokens
 * @param temperature - Temperature setting
 * @param messages - Chat messages array
 * @returns Object with model-appropriate parameters
 */
export function createOpenAIParams(model: string, maxTokens: number, temperature: number, messages: any[]) {
  const baseParams: any = {
    model,
    messages,
    temperature
  };

  // GPT-5 and o1 models use max_completion_tokens, others use max_tokens
  if (model.includes('gpt-5') || model.includes('o1')) {
    baseParams.max_completion_tokens = maxTokens;
  } else {
    baseParams.max_tokens = maxTokens;
  }

  return baseParams;
}
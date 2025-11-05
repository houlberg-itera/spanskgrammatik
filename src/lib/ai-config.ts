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
      systemPrompt: 'You are an expert Spanish language teacher creating educational exercises for Danish students.',
      userPromptTemplate: 'Generate {count} {exerciseType} exercises for {level} level on topic: {topic}',
      configFound: false,
      configName: 'default_bulk_generation'
    },
    'exercise_generation': {
      model: 'gpt-4o',
      temperature: 1,
      maxTokens: 1500,
      systemPrompt: 'You are a Spanish language teacher creating individual exercises.',
      userPromptTemplate: 'Create a {exerciseType} exercise for {level} level on: {topic}',
      configFound: false,
      configName: 'default_exercise_generation'
    },
    'vocabulary_generation': {
      model: 'gpt-4o',
      temperature: 1,
      maxTokens: 1800,
      systemPrompt: 'You are a Spanish vocabulary teacher creating exercises for Danish students.',
      userPromptTemplate: 'Generate {count} vocabulary exercises about {topic} for {level} level',
      configFound: false,
      configName: 'default_vocabulary_generation'
    }
  };

  const fallback = defaults[configName as keyof typeof defaults] || defaults['exercise_generation'];
  console.log(`🔄 [AI-Config] Using fallback defaults for: ${configName}`);
  
  return fallback;
}
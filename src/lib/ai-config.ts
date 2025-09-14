import { createClient } from '@/lib/supabase/server';

export interface AIConfiguration {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  examples: Record<string, any>;
  retry_config: {
    maxRetries: number;
    baseDelay: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Cache for configuration to avoid database calls on every request
const configCache = new Map<string, AIConfiguration>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getAIConfiguration(configName: string): Promise<AIConfiguration> {
  // Check cache first
  const cached = configCache.get(configName);
  const expiry = cacheExpiry.get(configName);
  
  if (cached && expiry && Date.now() < expiry) {
    return cached;
  }

  try {
    const supabase = await createClient();
    
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('name', configName)
      .eq('is_active', true)
      .single();

    if (error || !config) {
      console.warn(`AI configuration '${configName}' not found, using defaults`);
      return getDefaultConfiguration(configName);
    }

    // Cache the result
    configCache.set(configName, config);
    cacheExpiry.set(configName, Date.now() + CACHE_DURATION);

    return config;
  } catch (error) {
    console.error(`Error fetching AI configuration '${configName}':`, error);
    return getDefaultConfiguration(configName);
  }
}

export function getDefaultConfiguration(configName: string): AIConfiguration {
  const defaults: Record<string, Partial<AIConfiguration>> = {
    exercise_generation: {
      name: 'exercise_generation',
      description: 'Configuration for generating individual exercises',
      model_name: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1500,
      system_prompt: 'Du er en ekspert spansklærer for danske studerende. Opret øvelser på {{level}} niveau for emnet "{{topic}}" ({{topicDescription}}). Fokuser på {{exerciseType}} øvelser. Alle instruktioner, spørgsmål og forklaringer skal være på dansk. Svar altid i valid JSON format.',
      user_prompt_template: 'Opret {{questionCount}} {{exerciseType}} spørgsmål om "{{topic}}" på {{level}} niveau med {{difficulty}} sværhedsgrad. KRITISK: Brug rene spanske sætninger i øvelser uden danske ord. Eksempel FORKERT: "Jeg har købt _ casa i Spanien". Eksempel KORREKT: Instruktion på dansk + Spansk sætning: "He comprado _ casa en España". Svar i valid JSON format med denne struktur:\n\n{\n  "instructions_da": "Instruktioner på dansk",\n  "questions": [\n    {\n      "id": "unique_id",\n      "type": "question_type",\n      "question_da": "Spørgsmål på dansk (ren dansk)",\n      "options": ["mulighed1", "mulighed2", "mulighed3", "mulighed4"],\n      "correct_answer": "korrekte svar",\n      "explanation_da": "Forklaring på dansk med spansk eksempel",\n      "points": 1\n    }\n  ]\n}',
      examples: {
        grammar: {
          instructions_da: "Vælg den korrekte form af verbum 'ser' eller 'estar'",
          questions: [{
            id: "q1",
            type: "multiple_choice",
            question_da: "María ___ lærer (hun er lærer som profession)",
            options: ["es", "está", "son", "están"],
            correct_answer: "es",
            explanation_da: "Vi bruger 'ser' (es) for permanente egenskaber som profession.",
            points: 1
          }]
        }
      },
      retry_config: { maxRetries: 3, baseDelay: 1000 }
    },
    feedback_generation: {
      name: 'feedback_generation',
      description: 'Configuration for generating exercise feedback',
      model_name: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 150,
      system_prompt: 'Som spansklærer for danske studerende på {{level}} niveau, giv konstruktiv feedback på denne besvarelse.',
      user_prompt_template: 'Spørgsmål: {{question}}\nStuderendes svar: {{userAnswer}}\nKorrekte svar: {{correctAnswer}}\n\nGiv feedback på dansk der:\n1. Forklarer om svaret er korrekt eller forkert\n2. Forklarer hvorfor (grammatikregel, betydning, etc.)\n3. Giver et hjælpsomt tip til fremtiden\n4. Er opmuntrende og konstruktiv\n\nHold feedbacken kort (max 2-3 sætninger) og på begyndervenligt sprog.',
      examples: {},
      retry_config: { maxRetries: 3, baseDelay: 1000 }
    },
    bulk_generation: {
      name: 'bulk_generation',
      description: 'Configuration for bulk exercise generation',
      model_name: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 2500,
      system_prompt: 'Du er en ekspert spansklærer for danske studerende. Du skal oprette {{questionCount}} øvelser på {{level}} niveau for emnet "{{topic}}" med sværhedsgrad {{difficulty}}. Fokuser på {{exerciseType}} øvelser. KRITISK: Alle instruktioner og forklaringer skal være på dansk. Øvelsessætninger skal være på rent spansk UDEN dansk indblandet. ALDRIG bland dansk og spansk i samme sætning (fx "Jeg har købt _ casa i Spanien" ❌). Korrekt format: Dansk instruktion + Rent spansk øvelse (fx "He comprado _ casa en España" ✅). Svar altid i valid JSON format.',
      user_prompt_template: 'Opret {{questionCount}} {{exerciseType}} spørgsmål om "{{topic}}" på {{level}} niveau med {{difficulty}} sværhedsgrad.',
      examples: {},
      retry_config: { maxRetries: 3, baseDelay: 1000 }
    }
  };

  const defaultConfig = defaults[configName];
  if (!defaultConfig) {
    throw new Error(`No default configuration found for '${configName}'`);
  }

  return {
    id: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...defaultConfig
  } as AIConfiguration;
}

export function clearConfigCache(configName?: string): void {
  if (configName) {
    configCache.delete(configName);
    cacheExpiry.delete(configName);
  } else {
    configCache.clear();
    cacheExpiry.clear();
  }
}

// Template variable replacement utility
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, any>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return result;
}

// CRUD Operations for AI Configurations

export async function getAllConfigurations(): Promise<AIConfiguration[]> {
  try {
    const supabase = await createClient();
    
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all configurations:', error);
      throw new Error('Failed to fetch configurations');
    }

    return configs || [];
  } catch (error) {
    console.error('Error in getAllConfigurations:', error);
    throw error;
  }
}

export async function createConfiguration(config: Omit<AIConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<AIConfiguration> {
  try {
    const supabase = await createClient();
    
    const { data: newConfig, error } = await supabase
      .from('ai_configurations')
      .insert([{
        name: config.name,
        description: config.description,
        model_name: config.model_name,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        system_prompt: config.system_prompt,
        user_prompt_template: config.user_prompt_template,
        examples: config.examples || {},
        retry_config: config.retry_config || { maxRetries: 3, baseDelay: 1000 },
        is_active: config.is_active
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating configuration:', error);
      throw new Error('Failed to create configuration');
    }

    // Clear cache for the new configuration
    clearConfigCache(config.name);

    return newConfig;
  } catch (error) {
    console.error('Error in createConfiguration:', error);
    throw error;
  }
}

export async function updateConfiguration(id: number, config: Partial<AIConfiguration>): Promise<AIConfiguration> {
  try {
    const supabase = await createClient();
    
    const updateData: any = {};
    if (config.name !== undefined) updateData.name = config.name;
    if (config.description !== undefined) updateData.description = config.description;
    if (config.model_name !== undefined) updateData.model_name = config.model_name;
    if (config.temperature !== undefined) updateData.temperature = config.temperature;
    if (config.max_tokens !== undefined) updateData.max_tokens = config.max_tokens;
    if (config.system_prompt !== undefined) updateData.system_prompt = config.system_prompt;
    if (config.user_prompt_template !== undefined) updateData.user_prompt_template = config.user_prompt_template;
    if (config.examples !== undefined) updateData.examples = config.examples;
    if (config.retry_config !== undefined) updateData.retry_config = config.retry_config;
    if (config.is_active !== undefined) updateData.is_active = config.is_active;

    updateData.updated_at = new Date().toISOString();

    const { data: updatedConfig, error } = await supabase
      .from('ai_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating configuration:', error);
      throw new Error('Failed to update configuration');
    }

    // Clear cache for the updated configuration
    clearConfigCache(updatedConfig.name);

    return updatedConfig;
  } catch (error) {
    console.error('Error in updateConfiguration:', error);
    throw error;
  }
}

export async function deleteConfiguration(id: number): Promise<void> {
  try {
    const supabase = await createClient();
    
    // First get the configuration to clear its cache
    const { data: config } = await supabase
      .from('ai_configurations')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('ai_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting configuration:', error);
      throw new Error('Failed to delete configuration');
    }

    // Clear cache for the deleted configuration
    if (config?.name) {
      clearConfigCache(config.name);
    }
  } catch (error) {
    console.error('Error in deleteConfiguration:', error);
    throw error;
  }
}

export async function getConfigurationById(id: number): Promise<AIConfiguration | null> {
  try {
    const supabase = await createClient();
    
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching configuration by ID:', error);
      return null;
    }

    return config;
  } catch (error) {
    console.error('Error in getConfigurationById:', error);
    return null;
  }
}
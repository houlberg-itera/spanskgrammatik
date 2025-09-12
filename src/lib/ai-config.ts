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
      user_prompt_template: 'Opret {{questionCount}} {{exerciseType}} spørgsmål om "{{topic}}" på {{level}} niveau. Svar i valid JSON format med denne struktur:\n\n{\n  "instructions_da": "Instruktioner på dansk",\n  "questions": [\n    {\n      "id": "unique_id",\n      "type": "question_type",\n      "question_da": "Spørgsmål på dansk",\n      "options": ["mulighed1", "mulighed2", "mulighed3", "mulighed4"],\n      "correct_answer": "korrekte svar",\n      "explanation_da": "Forklaring på dansk med spansk eksempel",\n      "points": 1\n    }\n  ]\n}',
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
      system_prompt: 'Du er en ekspert spansklærer for danske studerende. Du skal oprette {{questionCount}} øvelser på {{level}} niveau for emnet "{{topic}}" med sværhedsgrad {{difficulty}}. Fokuser på {{exerciseType}} øvelser. Alle instruktioner og forklaringer skal være på dansk. Svar altid i valid JSON format.',
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
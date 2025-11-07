-- AI Configuration Management System
-- Creates the ai_configurations table for dynamic OpenAI model and prompt management

-- Create the ai_configurations table
CREATE TABLE IF NOT EXISTS ai_configurations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  model_name VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 2000 CHECK (max_tokens > 0 AND max_tokens <= 4000),
  system_prompt TEXT NOT NULL DEFAULT '',
  user_prompt_template TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_configurations_name ON ai_configurations(name);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_model_name ON ai_configurations(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_is_active ON ai_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_configurations_created_at ON ai_configurations(created_at);

-- Enable Row Level Security
ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin access only)
CREATE POLICY "Admins can view ai_configurations" ON ai_configurations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can insert ai_configurations" ON ai_configurations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update ai_configurations" ON ai_configurations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete ai_configurations" ON ai_configurations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_configurations_updated_at
  BEFORE UPDATE ON ai_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_configurations_updated_at();

-- Insert default configurations
INSERT INTO ai_configurations (name, description, model_name, temperature, max_tokens, system_prompt, user_prompt_template, is_active) VALUES
('exercise_generation', 'Working GPT-5 configuration for exercise generation', 'gpt-5', 0.7, 1500, 'Du er en ekspert i spansk grammatik og ordforråd, der laver øvelser for danske studerende der lærer spansk. Du skal lave øvelser, der er præcise, relevante og pædagogisk værdifulde.', 'Lav {{questionCount}} {{exerciseType}} øvelser på {{level}} niveau om {{topic}}. {{topicDescription}}

Svar ALTID i valid JSON format med denne struktur:
{
  "title": "Øvelse titel på dansk",
  "instructions": "Instruktioner på dansk", 
  "questions": [
    {
      "question_da": "Spørgsmål på dansk",
      "question_es": "Spørgsmål på spansk (kun hvis relevant)",
      "correct_answer": "Korrekt svar",
      "options": ["mulighed1", "mulighed2", "mulighed3", "mulighed4"],
      "explanation": "Forklaring på dansk"
    }
  ]
}', true),
('spanish_fill_in_blank', 'GPT-5 configuration for Spanish fill-in-the-blank exercises with Danish translations', 'gpt-5', 0.7, 1500, 'Du er en ekspert i spansk grammatik og ordforråd, der laver fill-in-the-blank øvelser for danske studerende der lærer spansk. Dine øvelser skal have spanske sætninger med blanks og danske oversættelser nedenunder.', 'Lav {{questionCount}} fill-in-the-blank øvelser på {{level}} niveau om {{topic}}. {{topicDescription}}

VIGTIGT: Øvelserne skal være spanske sætninger med blanks (_____) hvor studenten skal udfylde det manglende ord, og hver sætning skal have en dansk oversættelse nedenunder.

Svar ALTID i valid JSON format med denne struktur:
{
  "title": "Øvelse titel på dansk",
  "instructions": "Udfyld de manglende ord i de spanske sætninger", 
  "questions": [
    {
      "question_da": "Spansk sætning: Yo _____ un estudiante.\nDansk oversættelse: Jeg er en studerende.",
      "question_es": "Yo _____ un estudiante.",
      "correct_answer": "soy",
      "options": ["soy", "es", "son", "eres"],
      "explanation": "Forklaring på dansk om hvorfor svaret er korrekt"
    }
  ]
}', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  model_name = EXCLUDED.model_name,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  system_prompt = EXCLUDED.system_prompt,
  user_prompt_template = EXCLUDED.user_prompt_template,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add helpful comments
COMMENT ON TABLE ai_configurations IS 'Stores OpenAI model configurations for dynamic prompt and model management';
COMMENT ON COLUMN ai_configurations.name IS 'Unique identifier for the configuration';
COMMENT ON COLUMN ai_configurations.model_name IS 'OpenAI model name (gpt-4o, gpt-5, etc.)';
COMMENT ON COLUMN ai_configurations.temperature IS 'Model temperature (0.0-2.0)';
COMMENT ON COLUMN ai_configurations.max_tokens IS 'Maximum tokens for response (1-4000)';
COMMENT ON COLUMN ai_configurations.system_prompt IS 'System prompt with template variables';
COMMENT ON COLUMN ai_configurations.user_prompt_template IS 'User prompt template with placeholder variables';
COMMENT ON COLUMN ai_configurations.is_active IS 'Whether this configuration is currently active';

-- Display success message
SELECT 'AI Configurations table created successfully! Default configurations inserted.' as result;
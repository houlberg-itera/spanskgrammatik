-- Supabase Database Schema for Spanish Learning App

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create enum for language levels
CREATE TYPE spanish_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- Create enum for exercise types
CREATE TYPE exercise_type AS ENUM ('grammar', 'vocabulary', 'conjugation', 'sentence_structure');

-- Create enum for question types
CREATE TYPE question_type AS ENUM ('multiple_choice', 'fill_in_blank', 'translation', 'conjugation');

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  current_level spanish_level DEFAULT 'A1',
  role TEXT DEFAULT 'user', -- Added role field for permissions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create levels table
CREATE TABLE public.levels (
  id SERIAL PRIMARY KEY,
  name spanish_level UNIQUE NOT NULL,
  description_da TEXT NOT NULL, -- Danish description
  description_es TEXT NOT NULL, -- Spanish description
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table
CREATE TABLE public.topics (
  id SERIAL PRIMARY KEY,
  level spanish_level NOT NULL,
  name_da TEXT NOT NULL, -- Danish name
  name_es TEXT NOT NULL, -- Spanish name
  description_da TEXT,
  description_es TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercises table
CREATE TABLE public.exercises (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES public.topics(id) ON DELETE CASCADE,
  level spanish_level NOT NULL,
  type exercise_type NOT NULL,
  title_da TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_da TEXT,
  description_es TEXT,
  content JSONB NOT NULL, -- Exercise content and questions
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table
CREATE TABLE public.user_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES public.exercises(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER, -- Percentage score
  attempts INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Create user_level_progress table
CREATE TABLE public.user_level_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  level spanish_level NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  UNIQUE(user_id, level)
);

-- Insert default levels
INSERT INTO public.levels (name, description_da, description_es, order_index) VALUES
  ('A1', 'Begynder - Grundlæggende grammatik og ordforråd', 'Principiante - Gramática y vocabulario básico', 1),
  ('A2', 'Elementær - Udvidet grammatik og kommunikation', 'Elemental - Gramática ampliada y comunicación', 2),
  ('B1', 'Mellem - Avanceret grammatik og komplekse strukturer', 'Intermedio - Gramática avanzada y estructuras complejas', 3);

-- Create AI configuration table for dynamic prompts and models
CREATE TABLE public.ai_configurations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- e.g., 'exercise_generation', 'feedback_generation', 'bulk_generation'
  description TEXT,
  model_name TEXT NOT NULL DEFAULT 'gpt-4o',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1500,
  system_prompt TEXT,
  user_prompt_template TEXT,
  examples JSONB, -- Store examples for different exercise types
  retry_config JSONB DEFAULT '{"maxRetries": 3, "baseDelay": 1000}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prompt templates table for organized prompt management
CREATE TABLE public.prompt_templates (
  id SERIAL PRIMARY KEY,
  ai_config_id INTEGER REFERENCES public.ai_configurations(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL, -- 'grammar', 'vocabulary', 'conjugation', 'sentence_structure'
  level spanish_level,
  template_content TEXT NOT NULL,
  variables JSONB, -- Store template variables and their descriptions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default topics for A1 level
INSERT INTO public.topics (level, name_da, name_es, description_da, description_es, order_index) VALUES
  ('A1', 'Substantiver og artikler', 'Sustantivos y artículos', 'Grundlæggende substantiver og bestemte/ubestemte artikler', 'Sustantivos básicos y artículos definidos/indefinidos', 1),
  ('A1', 'Verbum "ser" og "estar"', 'Verbos "ser" y "estar"', 'Forskellen mellem de to verbum "at være"', 'La diferencia entre los dos verbos "ser" y "estar"', 2),
  ('A1', 'Grundlæggende navneord bøjning', 'Flexión básica de sustantivos', 'Ental og flertal af navneord', 'Singular y plural de sustantivos', 3),
  ('A1', 'Præsens af regelmæssige verbum', 'Presente de verbos regulares', 'Nutid af -ar, -er, -ir verbum', 'Presente de verbos -ar, -er, -ir', 4);

-- Insert default AI configurations
INSERT INTO public.ai_configurations (name, description, model_name, temperature, max_tokens, system_prompt, user_prompt_template, examples, retry_config) VALUES
(
  'exercise_generation',
  'Configuration for generating individual exercises',
  'gpt-4o',
  0.7,
  1500,
  'Du er en ekspert spansklærer for danske studerende. Opret øvelser på {{level}} niveau for emnet "{{topic}}" ({{topicDescription}}). Fokuser på {{exerciseType}} øvelser. Alle instruktioner, spørgsmål og forklaringer skal være på dansk. Svar altid i valid JSON format.',
  'Opret {{questionCount}} {{exerciseType}} spørgsmål om "{{topic}}" på {{level}} niveau. Svar i valid JSON format med denne struktur:\n\n{\n  "instructions_da": "Instruktioner på dansk",\n  "questions": [\n    {\n      "id": "unique_id",\n      "type": "question_type",\n      "question_da": "Spørgsmål på dansk",\n      "options": ["mulighed1", "mulighed2", "mulighed3", "mulighed4"],\n      "correct_answer": "korrekte svar",\n      "explanation_da": "Forklaring på dansk med spansk eksempel",\n      "points": 1\n    }\n  ]\n}',
  '{"grammar": {"instructions_da": "Vælg den korrekte form af verbum ''ser'' eller ''estar''", "questions": [{"id": "q1", "type": "multiple_choice", "question_da": "María ___ lærer (hun er lærer som profession)", "options": ["es", "está", "son", "están"], "correct_answer": "es", "explanation_da": "Vi bruger ''ser'' (es) for permanente egenskaber som profession.", "points": 1}]}}',
  '{"maxRetries": 3, "baseDelay": 1000}'
),
(
  'feedback_generation', 
  'Configuration for generating exercise feedback',
  'gpt-4o',
  0.7,
  150,
  'Som spansklærer for danske studerende på {{level}} niveau, giv konstruktiv feedback på denne besvarelse.',
  'Spørgsmål: {{question}}\nStuderendes svar: {{userAnswer}}\nKorrekte svar: {{correctAnswer}}\n\nGiv feedback på dansk der:\n1. Forklarer om svaret er korrekt eller forkert\n2. Forklarer hvorfor (grammatikregel, betydning, etc.)\n3. Giver et hjælpsomt tip til fremtiden\n4. Er opmuntrende og konstruktiv\n\nHold feedbacken kort (max 2-3 sætninger) og på begyndervenligt sprog.',
  '{}',
  '{"maxRetries": 3, "baseDelay": 1000}'
),
(
  'bulk_generation',
  'Configuration for bulk exercise generation',
  'gpt-4o', 
  0.7,
  2500,
  'Du er en ekspert spansklærer for danske studerende. Du skal oprette {{questionCount}} øvelser på {{level}} niveau for emnet "{{topic}}" med sværhedsgrad {{difficulty}}. Fokuser på {{exerciseType}} øvelser. Alle instruktioner og forklaringer skal være på dansk. Svar altid i valid JSON format.',
  'Opret {{questionCount}} {{exerciseType}} spørgsmål om "{{topic}}" på {{level}} niveau med {{difficulty}} sværhedsgrad.',
  '{}',
  '{"maxRetries": 3, "baseDelay": 1000}'
);

-- Insert default topics for A2 level
INSERT INTO public.topics (level, name_da, name_es, description_da, description_es, order_index) VALUES
  ('A2', 'Datid (pretérito perfecto)', 'Pretérito perfecto', 'Fortid med har/have + verbum', 'Pasado con haber + participio', 1),
  ('A2', 'Uregelmæssige verbum', 'Verbos irregulares', 'Almindelige uregelmæssige verbum i nutid', 'Verbos irregulares comunes en presente', 2),
  ('A2', 'Komparativ og superlativ', 'Comparativo y superlativo', 'Sammenligning af adjektiver', 'Comparación de adjetivos', 3);

-- Insert default topics for B1 level
INSERT INTO public.topics (level, name_da, name_es, description_da, description_es, order_index) VALUES
  ('B1', 'Konjunktiv (subjuntivo)', 'Subjuntivo', 'Konjunktiv modus og dets anvendelse', 'Modo subjuntivo y sus usos', 1),
  ('B1', 'Betinget modus (condicional)', 'Condicional', 'Betinget modus og hypotetiske situationer', 'Modo condicional y situaciones hipotéticas', 2),
  ('B1', 'Komplekse sætningsstrukturer', 'Estructuras de oraciones complejas', 'Relative sætninger og konjunktioner', 'Oraciones relativas y conjunciones', 3);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view their own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User progress policies
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own level progress" ON public.user_level_progress
  FOR ALL USING (auth.uid() = user_id);

-- Public read access for levels, topics, and exercises
CREATE POLICY "Everyone can view levels" ON public.levels
  FOR SELECT USING (true);

CREATE POLICY "Everyone can view topics" ON public.topics
  FOR SELECT USING (true);

CREATE POLICY "Everyone can view exercises" ON public.exercises
  FOR SELECT USING (true);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Initialize A1 level progress
  INSERT INTO public.user_level_progress (user_id, level)
  VALUES (new.id, 'A1');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update user progress
CREATE OR REPLACE FUNCTION public.update_user_progress(
  exercise_id_param INTEGER,
  score_param INTEGER
)
RETURNS void AS $$
DECLARE
  current_user_id UUID := auth.uid();
  exercise_level spanish_level;
  total_exercises INTEGER;
  completed_exercises INTEGER;
  level_progress INTEGER;
BEGIN
  -- Get exercise level
  SELECT level INTO exercise_level FROM public.exercises WHERE id = exercise_id_param;
  
  -- Update or insert user progress
  INSERT INTO public.user_progress (user_id, exercise_id, score, attempts, completed, completed_at)
  VALUES (current_user_id, exercise_id_param, score_param, 1, score_param >= 70, NOW())
  ON CONFLICT (user_id, exercise_id)
  DO UPDATE SET
    score = GREATEST(user_progress.score, score_param),
    attempts = user_progress.attempts + 1,
    completed = (GREATEST(user_progress.score, score_param) >= 70),
    completed_at = CASE WHEN (GREATEST(user_progress.score, score_param) >= 70) THEN NOW() ELSE user_progress.completed_at END,
    updated_at = NOW();
  
  -- Calculate level progress
  SELECT COUNT(*) INTO total_exercises
  FROM public.exercises
  WHERE level = exercise_level;
  
  SELECT COUNT(*) INTO completed_exercises
  FROM public.user_progress up
  JOIN public.exercises e ON up.exercise_id = e.id
  WHERE up.user_id = current_user_id
    AND e.level = exercise_level
    AND up.completed = true;
  
  level_progress := CASE WHEN total_exercises > 0 THEN (completed_exercises * 100 / total_exercises) ELSE 0 END;
  
  -- Update level progress
  UPDATE public.user_level_progress
  SET 
    progress_percentage = level_progress,
    completed_at = CASE WHEN level_progress >= 80 THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE user_id = current_user_id AND level = exercise_level;
  
  -- Update user's current level if they completed 80% of current level
  IF level_progress >= 80 THEN
    UPDATE public.users
    SET 
      current_level = CASE 
        WHEN exercise_level = 'A1' THEN 'A2'
        WHEN exercise_level = 'A2' THEN 'B1'
        ELSE current_level
      END,
      updated_at = NOW()
    WHERE id = current_user_id AND current_level = exercise_level;
    
    -- Initialize next level progress if unlocked
    IF exercise_level = 'A1' THEN
      INSERT INTO public.user_level_progress (user_id, level)
      VALUES (current_user_id, 'A2')
      ON CONFLICT (user_id, level) DO NOTHING;
    ELSIF exercise_level = 'A2' THEN
      INSERT INTO public.user_level_progress (user_id, level)
      VALUES (current_user_id, 'B1')
      ON CONFLICT (user_id, level) DO NOTHING;
    END IF;
  END IF;
END;
<<<<<<< HEAD
$$ LANGUAGE plpgsql SECURITY DEFINER;
=======
$$ LANGUAGE plpgsql SECURITY DEFINER;
>>>>>>> b7a9fe9a12675191bf20a1adbaf25ba95debfb4c

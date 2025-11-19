-- Migration: Add conversation practice tables
-- Description: Creates tables for conversation scenarios, dialogues, and user practice sessions

-- Create conversation_scenarios table
CREATE TABLE IF NOT EXISTS conversation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_da TEXT NOT NULL,
  title TEXT NOT NULL,
  description_da TEXT,
  description TEXT,
  target_language TEXT NOT NULL CHECK (target_language IN ('es', 'pt')),
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1')),
  difficulty_score INTEGER DEFAULT 1 CHECK (difficulty_score BETWEEN 1 AND 10),
  context_da TEXT,
  context TEXT,
  scenario_type TEXT DEFAULT 'dialogue' CHECK (scenario_type IN ('dialogue', 'role_play', 'interview')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create conversation_dialogues table
CREATE TABLE IF NOT EXISTS conversation_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES conversation_scenarios(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  speaker_role TEXT NOT NULL, -- 'teacher', 'student', 'native_speaker', etc.
  text TEXT NOT NULL,
  text_translation TEXT, -- Danish translation
  audio_url TEXT, -- TTS generated audio URL
  hints_da JSONB, -- Array of hints in Danish
  is_user_turn BOOLEAN DEFAULT false, -- Whether user should respond here
  expected_response TEXT, -- Expected user response (for comparison)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scenario_id, sequence_order)
);

-- Create user_conversation_sessions table
CREATE TABLE IF NOT EXISTS user_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES conversation_scenarios(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  current_dialogue_id UUID REFERENCES conversation_dialogues(id),
  score INTEGER, -- Overall session score 0-100
  pronunciation_score INTEGER, -- Pronunciation accuracy 0-100
  fluency_score INTEGER, -- Fluency score 0-100
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Create user_conversation_responses table
CREATE TABLE IF NOT EXISTS user_conversation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_conversation_sessions(id) ON DELETE CASCADE,
  dialogue_id UUID NOT NULL REFERENCES conversation_dialogues(id) ON DELETE CASCADE,
  audio_url TEXT, -- User's recorded audio
  transcribed_text TEXT, -- Speech recognition result
  transcribed_at TIMESTAMPTZ,
  pronunciation_score INTEGER, -- 0-100
  accuracy_score INTEGER, -- 0-100 (comparison to expected)
  feedback_da TEXT, -- Feedback in Danish
  feedback TEXT, -- Feedback in target language
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_conversation_scenarios_language ON conversation_scenarios(target_language);
CREATE INDEX idx_conversation_scenarios_level ON conversation_scenarios(level);
CREATE INDEX idx_conversation_dialogues_scenario ON conversation_dialogues(scenario_id);
CREATE INDEX idx_user_conversation_sessions_user ON user_conversation_sessions(user_id);
CREATE INDEX idx_user_conversation_sessions_scenario ON user_conversation_sessions(scenario_id);
CREATE INDEX idx_user_conversation_responses_session ON user_conversation_responses(session_id);

-- Add RLS policies
ALTER TABLE conversation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversation_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_scenarios
CREATE POLICY "Everyone can view active conversation scenarios"
  ON conversation_scenarios FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert conversation scenarios"
  ON conversation_scenarios FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update conversation scenarios"
  ON conversation_scenarios FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for conversation_dialogues
CREATE POLICY "Everyone can view dialogues"
  ON conversation_dialogues FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage dialogues"
  ON conversation_dialogues FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for user_conversation_sessions
CREATE POLICY "Users can view their own sessions"
  ON user_conversation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON user_conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON user_conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_conversation_responses
CREATE POLICY "Users can view their own responses"
  ON user_conversation_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_conversation_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own responses"
  ON user_conversation_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_conversation_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  ));

-- Insert sample conversation scenarios
INSERT INTO conversation_scenarios (title_da, title, description_da, description, target_language, level, context_da, context, scenario_type)
VALUES 
  (
    'Bestille på en cafe',
    'Pedir en una cafetería',
    'Øv dig i at bestille mad og drikke på en cafe',
    'Practica pidiendo comida y bebida en una cafetería',
    'es',
    'A1',
    'Du er på en cafe i Madrid og vil bestille kaffe og en croissant',
    'Estás en una cafetería en Madrid y quieres pedir café y un croissant',
    'dialogue'
  ),
  (
    'Præsentation af dig selv',
    'Presentarse a sí mismo',
    'Lær at præsentere dig selv og fortælle om dine interesser',
    'Aprende a presentarte y hablar de tus intereses',
    'es',
    'A1',
    'Du møder en ny person og skal præsentere dig selv',
    'Conoces a una persona nueva y debes presentarte',
    'dialogue'
  ),
  (
    'Pedir em um café',
    'Pedir em um café',
    'Øv dig i at bestille mad og drikke på en cafe',
    'Pratica pedir comida e bebida em um café',
    'pt',
    'A1',
    'Du er på en cafe i Lissabon og vil bestille kaffe og en croissant',
    'Você está em um café em Lisboa e quer pedir café e um croissant',
    'dialogue'
  );

-- Insert sample dialogues for Spanish cafe scenario
INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  1,
  'waiter',
  '¡Buenos días! ¿Qué desea?',
  'Godmorgen! Hvad ønsker du?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Pedir en una cafetería'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  2,
  'student',
  'Buenos días. Quiero un café con leche y un croissant, por favor.',
  'Godmorgen. Jeg vil gerne have en café con leche og en croissant, tak.',
  true,
  'Buenos días. Quiero un café con leche y un croissant, por favor.',
  '["Husk at sige buenos días først", "Brug ''quiero'' (jeg vil gerne have)", "Afslut med ''por favor''"]'::jsonb
FROM conversation_scenarios WHERE title = 'Pedir en una cafetería'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  3,
  'waiter',
  '¿Para aquí o para llevar?',
  'Til her eller med?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Pedir en una cafetería'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  4,
  'student',
  'Para aquí, por favor.',
  'Til her, tak.',
  true,
  'Para aquí, por favor.',
  '["Para aquí = til her", "Para llevar = med"]'::jsonb
FROM conversation_scenarios WHERE title = 'Pedir en una cafetería'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  5,
  'waiter',
  'Muy bien. Son tres euros con cincuenta.',
  'Meget godt. Det bliver tre euro og halvtreds.',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Pedir en una cafetería'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  6,
  'student',
  'Aquí tiene. Gracias.',
  'Værsgo. Tak.',
  true,
  'Aquí tiene. Gracias.',
  '["Aquí tiene = værsgo (når du giver noget til nogen)"]'::jsonb
FROM conversation_scenarios WHERE title = 'Pedir en una cafetería'
LIMIT 1;

-- Insert sample dialogues for Portuguese cafe scenario
INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  1,
  'waiter',
  'Bom dia! O que deseja?',
  'Godmorgen! Hvad ønsker du?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Pedir em um café'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  2,
  'student',
  'Bom dia. Quero um café com leite e um croissant, por favor.',
  'Godmorgen. Jeg vil gerne have en café com leche og en croissant, tak.',
  true,
  'Bom dia. Quero um café com leite e um croissant, por favor.',
  '["Husk at sige bom dia først", "Brug ''quero'' (jeg vil gerne have)", "Afslut med ''por favor''"]'::jsonb
FROM conversation_scenarios WHERE title = 'Pedir em um café'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  3,
  'waiter',
  'Para comer aqui ou para levar?',
  'Til her eller med?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Pedir em um café'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  4,
  'student',
  'Para comer aqui, por favor.',
  'Til her, tak.',
  true,
  'Para comer aqui, por favor.',
  '["Para comer aqui = til her", "Para levar = med"]'::jsonb
FROM conversation_scenarios WHERE title = 'Pedir em um café'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  5,
  'waiter',
  'Muito bem. São três euros e cinquenta.',
  'Meget godt. Det bliver tre euro og halvtreds.',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Pedir em um café'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  6,
  'student',
  'Aqui está. Obrigado.',
  'Værsgo. Tak.',
  true,
  'Aqui está. Obrigado.',
  '["Aqui está = værsgo (når du giver noget til nogen)", "Obrigado (mænd) / Obrigada (kvinder)"]'::jsonb
FROM conversation_scenarios WHERE title = 'Pedir em um café'
LIMIT 1;

-- Insert sample dialogues for Spanish self-introduction scenario
INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  1,
  'native_speaker',
  '¡Hola! ¿Cómo te llamas?',
  'Hej! Hvad hedder du?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  2,
  'student',
  'Hola. Me llamo María. ¿Y tú?',
  'Hej. Jeg hedder Maria. Og dig?',
  true,
  'Hola. Me llamo María. ¿Y tú?',
  '["Me llamo + dit navn", "¿Y tú? = og dig?"]'::jsonb
FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  3,
  'native_speaker',
  'Me llamo Carlos. ¿De dónde eres?',
  'Jeg hedder Carlos. Hvor kommer du fra?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  4,
  'student',
  'Soy de Dinamarca. ¿Y tú?',
  'Jeg er fra Danmark. Og dig?',
  true,
  'Soy de Dinamarca. ¿Y tú?',
  '["Soy de + land", "Dinamarca = Danmark"]'::jsonb
FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response)
SELECT 
  id,
  5,
  'native_speaker',
  'Soy de España. ¿Qué te gusta hacer?',
  'Jeg er fra Spanien. Hvad kan du lide at lave?',
  false,
  NULL
FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo'
LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT 
  id,
  6,
  'student',
  'Me gusta leer y viajar. ¿Y a ti?',
  'Jeg kan lide at læse og rejse. Og dig?',
  true,
  'Me gusta leer y viajar. ¿Y a ti?',
  '["Me gusta + verbum i infinitiv", "leer = læse, viajar = rejse"]'::jsonb
FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo'
LIMIT 1;

-- Add comment
COMMENT ON TABLE conversation_scenarios IS 'Conversation practice scenarios with context and metadata';
COMMENT ON TABLE conversation_dialogues IS 'Individual dialogue lines within conversation scenarios';
COMMENT ON TABLE user_conversation_sessions IS 'User practice sessions for conversation scenarios';
COMMENT ON TABLE user_conversation_responses IS 'User recorded responses with transcription and scoring';

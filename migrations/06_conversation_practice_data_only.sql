-- Migration: Insert conversation practice sample data
-- Run this if tables already exist but need sample data

-- Insert sample conversation scenarios (will skip if already exist)
INSERT INTO conversation_scenarios (title_da, title, description_da, description, target_language, level, context_da, context, scenario_type)
VALUES 
  ('Bestille på en cafe', 'Pedir en una cafetería', 'Øv dig i at bestille mad og drikke på en cafe', 'Practica pidiendo comida y bebida en una cafetería', 'es', 'A1', 'Du er på en cafe i Madrid og vil bestille kaffe og en croissant', 'Estás en una cafetería en Madrid y quieres pedir café y un croissant', 'dialogue'),
  ('Præsentation af dig selv', 'Presentarse a sí mismo', 'Lær at præsentere dig selv og fortælle om dine interesser', 'Aprende a presentarte y hablar de tus intereses', 'es', 'A1', 'Du møder en ny person og skal præsentere dig selv', 'Conoces a una persona nueva y debes presentarte', 'dialogue'),
  ('Pedir em um café', 'Pedir em um café', 'Øv dig i at bestille mad og drikke på en cafe', 'Pratica pedir comida e bebida em um café', 'pt', 'A1', 'Du er på en cafe i Lissabon og vil bestille kaffe og en croissant', 'Você está em um café em Lisboa e quer pedir café e um croissant', 'dialogue')
ON CONFLICT DO NOTHING;

-- Clear foreign key references first
UPDATE user_conversation_sessions 
SET current_dialogue_id = NULL 
WHERE current_dialogue_id IN (
  SELECT cd.id FROM conversation_dialogues cd
  INNER JOIN conversation_scenarios cs ON cd.scenario_id = cs.id
  WHERE cs.title IN ('Pedir en una cafetería', 'Presentarse a sí mismo', 'Pedir em um café')
);

-- Delete existing responses
DELETE FROM user_conversation_responses WHERE dialogue_id IN (
  SELECT cd.id FROM conversation_dialogues cd
  INNER JOIN conversation_scenarios cs ON cd.scenario_id = cs.id
  WHERE cs.title IN ('Pedir en una cafetería', 'Presentarse a sí mismo', 'Pedir em um café')
);

-- Now delete existing dialogues to avoid duplicates
DELETE FROM conversation_dialogues WHERE scenario_id IN (
  SELECT id FROM conversation_scenarios WHERE title IN ('Pedir en una cafetería', 'Presentarse a sí mismo', 'Pedir em um café')
);

-- Spanish cafe dialogues
INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 1, 'waiter', '¡Buenos días! ¿Qué desea?', 'Godmorgen! Hvad ønsker du?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Pedir en una cafetería' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 2, 'student', 'Buenos días. Quiero un café con leche y un croissant, por favor.', 'Godmorgen. Jeg vil gerne have en café con leche og en croissant, tak.', true, 'Buenos días. Quiero un café con leche y un croissant, por favor.', '["Husk at sige buenos días først", "Brug ''quiero'' (jeg vil gerne have)", "Afslut med ''por favor''"]'::jsonb FROM conversation_scenarios WHERE title = 'Pedir en una cafetería' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 3, 'waiter', '¿Para aquí o para llevar?', 'Til her eller med?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Pedir en una cafetería' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 4, 'student', 'Para aquí, por favor.', 'Til her, tak.', true, 'Para aquí, por favor.', '["Para aquí = til her", "Para llevar = med"]'::jsonb FROM conversation_scenarios WHERE title = 'Pedir en una cafetería' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 5, 'waiter', 'Muy bien. Son tres euros con cincuenta.', 'Meget godt. Det bliver tre euro og halvtreds.', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Pedir en una cafetería' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 6, 'student', 'Aquí tiene. Gracias.', 'Værsgo. Tak.', true, 'Aquí tiene. Gracias.', '["Aquí tiene = værsgo (når du giver noget til nogen)"]'::jsonb FROM conversation_scenarios WHERE title = 'Pedir en una cafetería' LIMIT 1;

-- Portuguese cafe dialogues
INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 1, 'waiter', 'Bom dia! O que deseja?', 'Godmorgen! Hvad ønsker du?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Pedir em um café' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 2, 'student', 'Bom dia. Quero um café com leite e um croissant, por favor.', 'Godmorgen. Jeg vil gerne have en café com leche og en croissant, tak.', true, 'Bom dia. Quero um café com leite e um croissant, por favor.', '["Husk at sige bom dia først", "Brug ''quero'' (jeg vil gerne have)", "Afslut med ''por favor''"]'::jsonb FROM conversation_scenarios WHERE title = 'Pedir em um café' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 3, 'waiter', 'Para comer aqui ou para levar?', 'Til her eller med?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Pedir em um café' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 4, 'student', 'Para comer aqui, por favor.', 'Til her, tak.', true, 'Para comer aqui, por favor.', '["Para comer aqui = til her", "Para levar = med"]'::jsonb FROM conversation_scenarios WHERE title = 'Pedir em um café' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 5, 'waiter', 'Muito bem. São três euros e cinquenta.', 'Meget godt. Det bliver tre euro og halvtreds.', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Pedir em um café' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 6, 'student', 'Aqui está. Obrigado.', 'Værsgo. Tak.', true, 'Aqui está. Obrigado.', '["Aqui está = værsgo (når du giver noget til nogen)", "Obrigado (mænd) / Obrigada (kvinder)"]'::jsonb FROM conversation_scenarios WHERE title = 'Pedir em um café' LIMIT 1;

-- Spanish self-introduction dialogues
INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 1, 'native_speaker', '¡Hola! ¿Cómo te llamas?', 'Hej! Hvad hedder du?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 2, 'student', 'Hola. Me llamo María. ¿Y tú?', 'Hej. Jeg hedder Maria. Og dig?', true, 'Hola. Me llamo María. ¿Y tú?', '["Me llamo + dit navn", "¿Y tú? = og dig?"]'::jsonb FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 3, 'native_speaker', 'Me llamo Carlos. ¿De dónde eres?', 'Jeg hedder Carlos. Hvor kommer du fra?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 4, 'student', 'Soy de Dinamarca. ¿Y tú?', 'Jeg er fra Danmark. Og dig?', true, 'Soy de Dinamarca. ¿Y tú?', '["Soy de + land", "Dinamarca = Danmark"]'::jsonb FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 5, 'native_speaker', 'Soy de España. ¿Qué te gusta hacer?', 'Jeg er fra Spanien. Hvad kan du lide at lave?', false, NULL, NULL FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo' LIMIT 1;

INSERT INTO conversation_dialogues (scenario_id, sequence_order, speaker_role, text, text_translation, is_user_turn, expected_response, hints_da)
SELECT id, 6, 'student', 'Me gusta leer y viajar. ¿Y a ti?', 'Jeg kan lide at læse og rejse. Og dig?', true, 'Me gusta leer y viajar. ¿Y a ti?', '["Me gusta + verbum i infinitiv", "leer = læse, viajar = rejse"]'::jsonb FROM conversation_scenarios WHERE title = 'Presentarse a sí mismo' LIMIT 1;

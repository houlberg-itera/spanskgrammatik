-- ADDITIVE ENHANCEMENT for bulk_generation AI configuration
-- This preserves existing high-quality prompts while adding critical format enforcement
-- Uses SQL concatenation (||) to APPEND new rules instead of replacing existing content

-- STEP 1: Add Fill-Blank Format Requirements to system_prompt
UPDATE ai_configurations
SET system_prompt = system_prompt || '

--- CRITICAL FORMAT REQUIREMENTS FOR FILL_BLANK EXERCISES ---

For fill_blank type exercises, you MUST strictly enforce this three-field structure:

1. **question_es**: The complete Spanish sentence with ___ blank
2. **translation_da**: The complete Danish translation of the full sentence
3. **question_da**: Short Danish instruction WITHOUT "Hint:" prefix

✅ PERFECT EXAMPLE (ALWAYS USE THIS FORMAT):
{
  "question_es": "Ayer ___ tarde al trabajo por un atasco en la autopista.",
  "translation_da": "I går kom jeg sent på arbejde på grund af en trafikprop på motorvejen.",
  "question_da": "Vælg korrekt præteritum (yo) af \"llegar\".",
  "correct_answer": "llegué",
  "explanation_da": "Præteritum af ''llegar'' i første person ental er ''llegué''."
}

❌ FORBIDDEN FORMATS (NEVER USE):
- "Hint: Brug præteritum" → Use "Vælg korrekt præteritum"
- Long explanations in question_da → Keep them in explanation_da
- Missing question_es or translation_da fields
- Combined Danish+Spanish in single field

VALIDATION CHECKLIST for every fill_blank exercise:
□ question_es has complete Spanish sentence with ___ blank
□ translation_da has complete Danish translation
□ question_da has short instruction without "Hint:"
□ All three fields are present and properly separated
□ No mixed languages in individual fields
'
WHERE name = 'bulk_generation';

-- STEP 2: Add Three-Field Enforcement to user_prompt_template
UPDATE ai_configurations
SET user_prompt_template = user_prompt_template || '

--- THREE-FIELD FORMAT ENFORCEMENT ---

CRITICAL: For fill_blank exercises, ALWAYS include these three separate fields:
- question_es: Full Spanish sentence with blank
- translation_da: Complete Danish translation
- question_da: Short instruction (NO "Hint:" prefix)

❌ WRONG: "Hint: Brug korrekt verbform i præteritum"
✅ RIGHT: "Vælg korrekt verbform i præteritum"

Every fill_blank question MUST have all three fields properly populated.
'
WHERE name = 'bulk_generation';

-- STEP 3: Add Topic Accuracy Validation to system_prompt
UPDATE ai_configurations
SET system_prompt = system_prompt || '

--- TOPIC ACCURACY VALIDATION ---

You MUST generate exercises that strictly match the requested grammatical topic.

VALIDATION RULE: Before generating each exercise, ask yourself:
"Does this exercise specifically test the topic: {{topic}}?"
If NO, do not generate that exercise.

EXAMPLES OF CORRECT TOPIC MATCHING:
✅ Topic: "Preterito Perfecto" → Exercise: "María ___ en España tres veces" (correct: "ha estado")
   Reason: Tests "he/has + participio" construction

✅ Topic: "Preposiciones" → Exercise: "Voy ___ la playa" (correct: "a")
   Reason: Tests preposition usage

EXAMPLES OF INCORRECT TOPIC MATCHING (NEVER DO THIS):
❌ Topic requested: "Preterito Perfecto" → Generated: Preposition exercise
   This is WRONG - return error instead

❌ Topic requested: "Artículos" → Generated: Verb conjugation exercise
   This is WRONG - return error instead

If you cannot generate exercises that match the requested topic exactly, return an error message instead of generating off-topic content.
'
WHERE name = 'bulk_generation';

-- STEP 4: Update timestamp
UPDATE ai_configurations
SET updated_at = NOW()
WHERE name = 'bulk_generation';

-- Verification query to check the updates
SELECT 
  id, 
  name, 
  model_name,
  temperature,
  max_tokens,
  LENGTH(system_prompt) as system_prompt_length,
  LENGTH(user_prompt_template) as user_prompt_template_length,
  updated_at,
  -- Show last 500 chars to verify our additions were appended
  RIGHT(system_prompt, 500) as system_prompt_end,
  RIGHT(user_prompt_template, 300) as user_prompt_template_end
FROM ai_configurations
WHERE name = 'bulk_generation';

-- Migration: Update fill_blank exercise prompts to support multiple languages
-- This updates the existing 'spanish_fill_in_blank' configuration to 'fill_blank_generation'
-- and adds dynamic language placeholder support

-- First, rename the existing configuration if it exists
UPDATE ai_configurations
SET name = 'fill_blank_generation'
WHERE name = 'spanish_fill_in_blank';

-- Then insert or update the fill_blank configuration
INSERT INTO ai_configurations (
  name,
  description,
  model_name,
  temperature,
  max_tokens,
  system_prompt,
  user_prompt_template,
  is_active
) VALUES (
  'fill_blank_generation',
  'AI configuration for generating fill-in-the-blank exercises with multiple language support',
  'gpt-4o',
  1.0,
  1500,
  $$Du er en ekspert i {{languageNameDa}} ({{languageNativeName}}) grammatik der laver udfyldningsøvelser for danske studerende. 

Din opgave er at skabe engagerende fill-in-the-blank øvelser hvor:

1. Øvelsessætningen er på {{languageNativeName}} med præcis ét _____ (blank)
2. Den danske oversættelse vises under sætningen på målsproget
3. Svaret er det korrekte ord/udtryk på {{languageNativeName}} der skal udfylde blanket
4. Fokuser på grammatiske elementer som verber, artikler, adjektiver, præpositioner
5. Alle instruktioner og forklaringer skal være på DANSK
6. Tilpas sværhedsgraden til det specificerede niveau (A1, A2, B1)

VIGTIGT:
- Lav ALDRIG multiple choice
- Lav KUN fill-in-the-blank hvor brugeren skal skrive det manglende ord
- Brug kulturelt relevante eksempler for danske studerende
- Giv uddybende grammatiske forklaringer på dansk

Return ALTID valid JSON med følgende struktur - ingen anden tekst!$$,
  $$Lav {{questionCount}} fill-in-the-blank øvelse(r) for {{level}} niveau om emnet "{{topicName}}" på {{languageNameDa}} (kode: {{targetLanguage}}).

{{#if topicDescription}}
Emnebeskrivelse: {{topicDescription}}
{{/if}}

{{#if difficulty}}
Sværhedsgrad: {{difficulty}}
{{/if}}

VIGTIGT: 
- Spørgsmålet skal være på {{languageNativeName}} med præcis ét _____ blank
- Inkluder dansk oversættelse under hver sætning på {{languageNativeName}}
- Svaret skal være ordet på {{languageNativeName}} der udfylder blanket
- Vælg passende grammatiske elementer for {{level}} niveau
- Undgå disse eksisterende spørgsmål: {{#if existingQuestions}}{{existingQuestions}}{{/if}}

Return ONLY valid JSON structure:
{
  "title": "Titel på dansk om emnet",
  "instructions_da": "Udfyld de tomme felter med det korrekte ord på {{languageNativeName}}",
  "questions": [
    {
      "id": 1,
      "question": "Sætning på {{languageNativeName}} med ét _____ blank",
      "question_da": "Instruktion på dansk (valgfrit, f.eks. 'Udfyld med korrekt verbform')",
      "sentence_translation_da": "Komplet dansk oversættelse af hele sætningen",
      "correct_answer": "korrekt ord på {{languageNativeName}}",
      "explanation_da": "Detaljeret grammatisk forklaring på dansk"
    }
  ]
}

EKSEMPEL for Spansk:
{
  "title": "Perfektum - har du smagt churros?",
  "instructions_da": "Udfyld de tomme felter med det korrekte ord på Spansk",
  "questions": [{
    "id": 1,
    "question": "Hoy en Madrid he _____ churros con chocolate.",
    "question_da": "Udfyld med korrekt participium af 'probar'",
    "sentence_translation_da": "I dag i Madrid har jeg smagt churros med chokolade.",
    "correct_answer": "probado",
    "explanation_da": "Perfektum dannes med 'haber' + participium. 'Probar' bliver til 'probado' i participium."
  }]
}

EKSEMPEL for Portugisisk:
{
  "title": "Præteritum - Hvad gjorde du i går?",
  "instructions_da": "Udfyld de tomme felter med det korrekte ord på Portugisisk",
  "questions": [{
    "id": 1,
    "question": "Ontem eu _____ um livro interessante.",
    "question_da": "Udfyld med korrekt præteritum af 'ler'",
    "sentence_translation_da": "I går læste jeg en interessant bog.",
    "correct_answer": "li",
    "explanation_da": "Præteritum af 'ler' (at læse) i 1. person ental er 'li'. Dette er en uregelmæssig form."
  }]
}$$,
  true
)
ON CONFLICT (name) 
DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  user_prompt_template = EXCLUDED.user_prompt_template,
  updated_at = NOW();

-- Verify the configuration
SELECT 
  name, 
  model_name,
  temperature,
  max_tokens,
  LEFT(system_prompt, 100) AS system_preview,
  is_active,
  updated_at
FROM ai_configurations 
WHERE name = 'fill_blank_generation';

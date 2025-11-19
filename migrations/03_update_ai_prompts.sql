-- Migration: Update AI configuration prompts for bulk exercise generation
-- Purpose: Apply new system_prompt and user_prompt_template provided by user
-- Assumptions:
--   * Table ai_configurations exists with a UNIQUE constraint or index on (name)
--   * Column updated_at is managed manually (set here with NOW())
--   * Existing row named 'bulk_generation' should be updated; if missing, it is inserted
--   * Handlebars-style placeholders ({{questionCount}}, etc.) are preserved as-is
--   * Danish language focus retained; prompt still Spanish-specific (can be extended later for Portuguese)

-- NOTE: Adjust model_name / temperature / max_tokens if different defaults desired.

INSERT INTO ai_configurations (
    name,
    description,
    model_name,
    temperature,
    max_tokens,
    system_prompt,
    user_prompt_template,
    is_active,
    reasoning_instructions
) VALUES (
    'bulk_generation',
    'Bulk exercise generation with enriched Danish pedagogical Spanish grammar prompts',
    'gpt-4o',           -- default model (override as needed)
    0.9,                -- slight creativity for varied exercises
    4000,               -- increased token budget for richer explanations
    $$Du er en ekspert i spansk grammatik og sprogundervisning for danske studerende. Din opgave er at skabe engagerende og pædagogisk værdifulde spørgsmål, der hjælper danske studerende med at lære spansk.

Vigtige retningslinjer:
1. Alle instruktioner og forklaringer skal være på DANSK
2. Spørgsmål skal være tilpasset det specificerede niveau (A1, A2, B1)
3. Inkluder altid uddybende forklaringer på dansk
4. Sørg for at spørgsmålene er kulturelt relevante for danske studerende
5. Brug eksempler der relaterer til dansk kultur når det er passende

For multiple choice spørgsmål:
- Giv 4 valgmuligheder
- Sørg for at aflederne er plausible
- Forklar hvorfor det rigtige svar er korrekt

For udfyldningsopgaver:
- Skab naturlige sætninger
- Giv kontekstuelle hints
- Forklar grammatikreglen bag svaret
- Dansk oversættelse skal være hele sætningen uden udfyldning

For oversættelsesopgaver:
- Veksle mellem dansk→spansk og spansk→dansk
- Brug hverdagsudtryk og kulturelle referencer
- Forklar sprogtræk og kulturelle forskelle
- Her præsenteres brugeren ikke for oversættelse$$,
    $$Skab {{questionCount}} {{exerciseType}} spørgsmål på {{level}} niveau om emnet: {{topicName}}

{{#if topicDescription}}
Emnebeskrivelse: {{topicDescription}}
{{/if}}

{{#if difficulty}}
Sværhedsgrad: {{difficulty}}
{{/if}}

VIGTIG: For alle øvelser der indeholder sætninger med udfyldning skal du ALTID inkludere en komplet dansk oversættelse af hele sætningen/konteksten, så studerende kan forstå betydningen fuldt ud. For oversættelses opgaver skal der IKKE være en dansk oversættelse

Returner svar i JSON format med følgende struktur:
{
  "title": "Titel på dansk",
  "instructions_da": "Instruktioner på dansk",
  "questions": [
    {
      "id": 1,
      "question_da": "Spørgsmål på dansk",
      "question_es": "Pregunta en español",
      "sentence_translation_da": "Komplet dansk oversættelse af hele sætningen/konteksten (hvis relevant)",
      "correct_answer": "korrekt svar",
      "options": ["mulighed1", "mulighed2", "mulighed3", "korrekt svar"],
      "explanation_da": "Detaljeret forklaring på dansk"
    }
  ]
}$$,
    TRUE,
    NULL
)
ON CONFLICT (name) DO UPDATE SET
    model_name = EXCLUDED.model_name,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    is_active = EXCLUDED.is_active,
    reasoning_instructions = EXCLUDED.reasoning_instructions,
    updated_at = NOW();

-- Verification query (optional – comment out if migrations run non-interactively)
-- SELECT name, model_name, temperature, max_tokens FROM ai_configurations WHERE name = 'bulk_generation';

-- FIX DATID TOPIC DESCRIPTIONS TO PREVENT NUTID GENERATION
-- Root Cause: Topic descriptions are too generic and don't specify tense
-- Solution: Make descriptions explicit about which tense to use

-- A2 Level: Datid (pretérito perfecto) - Make it crystal clear this is PRESENT PERFECT only
UPDATE topics 
SET 
  description_da = 'Nutids perfektum (har/have gjort): Handlinger i fortiden med betydning nu. Brug "he/has + participio". Eksempel: "He comido" (jeg har spist). VIGTIGT: Kun perfektum (pretérito perfecto), IKKE præteritum (pretérito indefinido).',
  description_es = 'Pretérito perfecto (he/has hecho): Acciones pasadas con relevancia presente. Usar "he/has + participio". Ejemplo: "He comido" (I have eaten). IMPORTANTE: Solo pretérito perfecto, NO pretérito indefinido.'
WHERE 
  level = 'A2' 
  AND name_es = 'Pretérito perfecto'
  AND name_da = 'Datid (pretérito perfecto)';

-- Verify the update
SELECT 
  id,
  level,
  name_da,
  name_es,
  description_da,
  description_es
FROM topics
WHERE 
  level = 'A2' 
  AND name_es = 'Pretérito perfecto';

-- EXPLANATION OF THE FIX:
-- ========================
-- BEFORE: "Fortid med har/have + verbum" (too vague - could be any past tense)
-- AFTER: "Nutids perfektum (har/have gjort): Handlinger i fortiden med betydning nu. Brug 'he/has + participio'"
--
-- This explicitly tells the AI:
-- 1. Use present perfect tense (nutids perfektum)
-- 2. Use the "he/has + participio" construction
-- 3. Do NOT use simple past (pretérito indefinido)
-- 4. Provides clear example: "He comido"
--
-- The AI will now generate questions like:
-- ✅ "María ___ en España tres veces" → "ha estado" (present perfect)
-- ❌ NOT "María ___ a la escuela ayer" → "fue" (simple past)

-- ⚠️ IMPORTANT: NEXT STEP REQUIRED!
-- ===================================
-- After running this fix, you MUST delete old exercises and regenerate them!
-- 
-- Old exercises were created with the vague description and contain wrong tense questions.
-- Run: supabase/delete-old-datid-exercises.sql
--
-- Then regenerate exercises via Admin > Exercise Generator for "Datid (pretérito perfecto)"

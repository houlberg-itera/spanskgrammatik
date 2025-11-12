-- DELETE OLD DATID EXERCISES THAT WERE GENERATED WITH WRONG TENSE
-- These exercises were created before the topic description fix
-- They test present tense instead of pretérito perfecto

-- First, let's see what we have
SELECT 
  e.id,
  e.title,
  e.content->'questions'->0->>'question_da' as first_question,
  e.content->'questions'->0->>'correct_answer' as first_answer,
  t.name_da as topic_name,
  t.level,
  e.created_at
FROM exercises e
JOIN topics t ON e.topic_id = t.id
WHERE t.name_da = 'Datid (pretérito perfecto)'
ORDER BY e.created_at DESC
LIMIT 10;

-- Check for questions testing present tense (nutid) in this topic
SELECT 
  e.id,
  e.title,
  jsonb_array_length(e.content->'questions') as question_count,
  e.content->'questions' as all_questions
FROM exercises e
JOIN topics t ON e.topic_id = t.id
WHERE 
  t.name_da = 'Datid (pretérito perfecto)'
  AND (
    e.content->'questions'::text ILIKE '%nutid%'  -- Contains "nutid" (present tense)
    OR e.content->'questions'::text ILIKE '%ser%'  -- Contains "ser" (present tense verb)
    OR e.content->'questions'::text ILIKE '%estar%' -- Contains "estar" (present tense verb)
  )
  AND NOT (
    e.content->'questions'::text ILIKE '%he %'  -- Should contain "he" (present perfect)
    OR e.content->'questions'::text ILIKE '%has %' -- Should contain "has" (present perfect)
    OR e.content->'questions'::text ILIKE '%ha %'  -- Should contain "ha" (present perfect)
  );

-- UNCOMMENT THE FOLLOWING TO DELETE THE WRONG EXERCISES
-- WARNING: This will permanently delete exercises!
-- Make sure to backup first if needed

/*
DELETE FROM exercises
WHERE id IN (
  SELECT e.id
  FROM exercises e
  JOIN topics t ON e.topic_id = t.id
  WHERE 
    t.name_da = 'Datid (pretérito perfecto)'
    AND (
      e.content->'questions'::text ILIKE '%nutid%'
      OR e.content->'questions'::text ILIKE '%ser%'
      OR e.content->'questions'::text ILIKE '%estar%'
    )
    AND NOT (
      e.content->'questions'::text ILIKE '%he %'
      OR e.content->'questions'::text ILIKE '%has %'
      OR e.content->'questions'::text ILIKE '%ha %'
    )
);
*/

-- After deleting, generate new exercises using the admin interface
-- The new exercises will use the updated topic description
-- and should correctly test pretérito perfecto

-- VERIFICATION QUERY - Run after generating new exercises:
-- This should show exercises with "he/has/ha" and NOT "nutid"
SELECT 
  e.id,
  e.title,
  e.content->'questions'->0->>'question_da' as first_question,
  e.content->'questions'->0->>'question_es' as first_spanish,
  e.content->'questions'->0->>'correct_answer' as answer
FROM exercises e
JOIN topics t ON e.topic_id = t.id
WHERE t.name_da = 'Datid (pretérito perfecto)'
ORDER BY e.created_at DESC
LIMIT 5;

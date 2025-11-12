-- Check how many questions are missing Danish translations

-- Summary counts
SELECT 
  COUNT(*) as total_questions,
  COUNT(translation_da) as with_translation,
  COUNT(*) FILTER (WHERE translation_da IS NULL OR translation_da = '') as missing_translation,
  ROUND(100.0 * COUNT(translation_da) / COUNT(*), 2) as pct_with_translation
FROM exercises
WHERE question_es IS NOT NULL;

-- Find specific examples of missing translations
SELECT 
  id,
  type as question_type,
  level,
  question_es,
  translation_da,
  created_at
FROM exercises
WHERE question_es IS NOT NULL
  AND (translation_da IS NULL OR translation_da = '')
ORDER BY created_at DESC
LIMIT 20;

-- Check if pattern: old exercises vs new
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(translation_da) as with_translation,
  COUNT(*) - COUNT(translation_da) as missing
FROM exercises
WHERE question_es IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 10;

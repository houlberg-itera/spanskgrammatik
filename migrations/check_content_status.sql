-- Check what content exists for each language

-- Count topics by language
SELECT 
    target_language,
    level,
    COUNT(*) as topic_count
FROM topics
GROUP BY target_language, level
ORDER BY target_language, level;

-- Count exercises by language
SELECT 
    target_language,
    level,
    COUNT(*) as exercise_count
FROM exercises
GROUP BY target_language, level
ORDER BY target_language, level;

-- Show Portuguese topics (if any)
SELECT id, name, level, target_language, created_at
FROM topics
WHERE target_language = 'pt'
ORDER BY level, id;

-- Show Portuguese exercises (if any)
SELECT id, title, level, topic_id, target_language, created_at
FROM exercises
WHERE target_language = 'pt'
ORDER BY level, id;

-- Check if Portuguese topics exist but have no exercises
SELECT 
    t.id as topic_id,
    t.name as topic_name,
    t.level,
    COUNT(e.id) as exercise_count
FROM topics t
LEFT JOIN exercises e ON t.id = e.topic_id AND e.target_language = 'pt'
WHERE t.target_language = 'pt'
GROUP BY t.id, t.name, t.level
ORDER BY t.level, t.id;

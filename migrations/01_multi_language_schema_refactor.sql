-- Multi-Language Schema Refactoring Migration
-- This migration refactors language-specific fields (name_es, name_pt) 
-- to generic fields (name) with target_language identifier
-- Run this migration to enable infinite language scaling

-- ============================================
-- STEP 1: Users Table
-- ============================================

-- Add target_language column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS target_language VARCHAR(2) DEFAULT 'es';

-- Add constraint to ensure valid language codes (expand as needed)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_target_language_check;

ALTER TABLE users 
ADD CONSTRAINT users_target_language_check 
CHECK (target_language IN ('es', 'pt'));

-- Set default for existing users
UPDATE users 
SET target_language = 'es' 
WHERE target_language IS NULL;

-- ============================================
-- STEP 2: Topics Table - Refactor to Generic Fields
-- ============================================

-- Add target_language column
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS target_language VARCHAR(2) DEFAULT 'es';

-- Add generic name and description columns
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrate existing Spanish data to generic fields
UPDATE topics 
SET name = name_es 
WHERE name IS NULL AND name_es IS NOT NULL;

UPDATE topics 
SET description = description_es 
WHERE description IS NULL AND description_es IS NOT NULL;

-- Add constraint
ALTER TABLE topics 
DROP CONSTRAINT IF EXISTS topics_target_language_check;

ALTER TABLE topics 
ADD CONSTRAINT topics_target_language_check 
CHECK (target_language IN ('es', 'pt'));

-- Set default language for existing topics
UPDATE topics 
SET target_language = 'es' 
WHERE target_language IS NULL;

-- Make generic fields NOT NULL after migration
ALTER TABLE topics 
ALTER COLUMN name SET NOT NULL;

-- Remove NOT NULL constraint from old columns to allow migration
ALTER TABLE topics 
ALTER COLUMN name_es DROP NOT NULL;

-- Optional: Drop old language-specific columns (uncomment when ready)
-- ALTER TABLE topics DROP COLUMN IF EXISTS name_es;
-- ALTER TABLE topics DROP COLUMN IF EXISTS name_pt;
-- ALTER TABLE topics DROP COLUMN IF EXISTS description_es;
-- ALTER TABLE topics DROP COLUMN IF EXISTS description_pt;

-- ============================================
-- STEP 3: Exercises Table - Refactor to Generic Fields
-- ============================================

-- Add target_language column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS target_language VARCHAR(2) DEFAULT 'es';

-- Add generic title and description columns
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrate existing Spanish data to generic fields
UPDATE exercises 
SET title = title_es 
WHERE title IS NULL AND title_es IS NOT NULL;

UPDATE exercises 
SET description = description_es 
WHERE description IS NULL AND description_es IS NOT NULL;

-- Add constraint
ALTER TABLE exercises 
DROP CONSTRAINT IF EXISTS exercises_target_language_check;

ALTER TABLE exercises 
ADD CONSTRAINT exercises_target_language_check 
CHECK (target_language IN ('es', 'pt'));

-- Set default language for existing exercises
UPDATE exercises 
SET target_language = 'es' 
WHERE target_language IS NULL;

-- Make generic fields NOT NULL after migration
ALTER TABLE exercises 
ALTER COLUMN title SET NOT NULL;

-- Remove NOT NULL constraint from old columns to allow migration
ALTER TABLE exercises 
ALTER COLUMN title_es DROP NOT NULL;

-- Optional: Drop old language-specific columns (uncomment when ready)
-- ALTER TABLE exercises DROP COLUMN IF EXISTS title_es;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS title_pt;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS description_es;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS description_pt;

-- ============================================
-- STEP 4: Exercises Content JSONB - Refactor Questions
-- ============================================

-- Note: This updates the questions array in the content JSONB column
-- to use generic 'question' field instead of 'question_es'/'question_pt'

-- First, let's add a 'question' field by copying from 'question_es' where it exists
UPDATE exercises
SET content = jsonb_set(
    content,
    '{questions}',
    (
        SELECT jsonb_agg(
            CASE 
                WHEN elem->>'question_es' IS NOT NULL THEN
                    elem || jsonb_build_object('question', elem->>'question_es')
                ELSE
                    elem
            END
        )
        FROM jsonb_array_elements(content->'questions') elem
    )
)
WHERE content->'questions' IS NOT NULL;

-- Optional: Remove old question_es and question_pt fields (uncomment when ready)
-- UPDATE exercises
-- SET content = jsonb_set(
--     content,
--     '{questions}',
--     (
--         SELECT jsonb_agg(elem - 'question_es' - 'question_pt')
--         FROM jsonb_array_elements(content->'questions') elem
--     )
-- )
-- WHERE content->'questions' IS NOT NULL;

-- ============================================
-- STEP 5: Levels Table
-- ============================================

-- Add generic description column
ALTER TABLE levels 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrate existing Spanish descriptions
UPDATE levels 
SET description = description_es 
WHERE description IS NULL AND description_es IS NOT NULL;

-- Optional: Drop old language-specific columns (uncomment when ready)
-- ALTER TABLE levels DROP COLUMN IF EXISTS description_es;
-- ALTER TABLE levels DROP COLUMN IF EXISTS description_pt;

-- ============================================
-- STEP 6: User Level Progress - Track Progress Per Language
-- ============================================

-- Add target_language column
ALTER TABLE user_level_progress 
ADD COLUMN IF NOT EXISTS target_language VARCHAR(2) DEFAULT 'es';

-- Add constraint
ALTER TABLE user_level_progress 
DROP CONSTRAINT IF EXISTS user_level_progress_target_language_check;

ALTER TABLE user_level_progress 
ADD CONSTRAINT user_level_progress_target_language_check 
CHECK (target_language IN ('es', 'pt'));

-- Set default language for existing progress
UPDATE user_level_progress 
SET target_language = 'es' 
WHERE target_language IS NULL;

-- Update unique constraint to include language
-- This allows users to have separate progress for each language
ALTER TABLE user_level_progress 
DROP CONSTRAINT IF EXISTS user_level_progress_user_id_level_key;

-- Only add the new constraint if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_level_progress_user_id_level_language_key'
    ) THEN
        ALTER TABLE user_level_progress 
        ADD CONSTRAINT user_level_progress_user_id_level_language_key 
        UNIQUE (user_id, level, target_language);
    END IF;
END $$;

-- ============================================
-- STEP 7: Indexes for Performance
-- ============================================

-- Add indexes on target_language for faster filtering
CREATE INDEX IF NOT EXISTS idx_topics_target_language 
ON topics(target_language);

CREATE INDEX IF NOT EXISTS idx_exercises_target_language 
ON exercises(target_language);

CREATE INDEX IF NOT EXISTS idx_user_level_progress_target_language 
ON user_level_progress(target_language);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_topics_level_language 
ON topics(level, target_language);

CREATE INDEX IF NOT EXISTS idx_exercises_topic_language 
ON exercises(topic_id, target_language);

CREATE INDEX IF NOT EXISTS idx_user_level_progress_user_language 
ON user_level_progress(user_id, target_language);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all records have target_language set
-- SELECT COUNT(*) as topics_without_language FROM topics WHERE target_language IS NULL;
-- SELECT COUNT(*) as exercises_without_language FROM exercises WHERE target_language IS NULL;
-- SELECT COUNT(*) as users_without_language FROM users WHERE target_language IS NULL;

-- Check language distribution
-- SELECT target_language, COUNT(*) as count FROM topics GROUP BY target_language;
-- SELECT target_language, COUNT(*) as count FROM exercises GROUP BY target_language;
-- SELECT target_language, COUNT(*) as count FROM users GROUP BY target_language;

-- ============================================
-- ROLLBACK SCRIPT (Save separately if needed)
-- ============================================

/*
-- To rollback this migration (CAUTION: May lose data):

-- Drop new columns
ALTER TABLE users DROP COLUMN IF EXISTS target_language;
ALTER TABLE topics DROP COLUMN IF EXISTS target_language, DROP COLUMN IF EXISTS name, DROP COLUMN IF EXISTS description;
ALTER TABLE exercises DROP COLUMN IF EXISTS target_language, DROP COLUMN IF EXISTS title, DROP COLUMN IF EXISTS description;
ALTER TABLE levels DROP COLUMN IF EXISTS description;
ALTER TABLE user_level_progress DROP COLUMN IF EXISTS target_language;

-- Drop indexes
DROP INDEX IF EXISTS idx_topics_target_language;
DROP INDEX IF EXISTS idx_exercises_target_language;
DROP INDEX IF EXISTS idx_user_level_progress_target_language;
DROP INDEX IF EXISTS idx_topics_level_language;
DROP INDEX IF EXISTS idx_exercises_topic_language;
DROP INDEX IF EXISTS idx_user_level_progress_user_language;
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Remember to:
-- 1. Test the migration on a copy of production data first
-- 2. Back up your database before running
-- 3. Run verification queries after migration
-- 4. Update application code to use generic field names
-- 5. Uncomment DROP COLUMN statements only after confirming everything works

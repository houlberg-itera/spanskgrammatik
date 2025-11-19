-- Remove NOT NULL constraints from old language-specific columns
-- This allows new content to be created using only the generic fields

-- Topics table
ALTER TABLE topics 
ALTER COLUMN name_es DROP NOT NULL;

-- Exercises table  
ALTER TABLE exercises 
ALTER COLUMN title_es DROP NOT NULL;

-- Verify the changes
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'topics' 
  AND column_name IN ('name', 'name_es', 'name_pt')
ORDER BY column_name;

SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'exercises' 
  AND column_name IN ('title', 'title_es', 'title_pt')
ORDER BY column_name;

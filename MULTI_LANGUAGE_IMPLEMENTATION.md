# Multi-Language Support Implementation

## Overview
The application now supports multiple target languages beyond Spanish. Portuguese is the first additional language implemented, with the infrastructure in place to easily add more languages in the future.

## Schema Design

**New Approach:** Instead of adding language-specific columns (name_es, name_pt, name_fr, etc.) for each new language, we use **generic columns** (name, description, question) with a **target_language identifier**. This allows infinite language scaling without schema changes.

**Benefits:**
- Add new languages without altering database schema
- Cleaner, more maintainable codebase
- Standard query patterns across all languages
- No field name proliferation

## Database Changes Required

**Migration Script:** See `migrations/01_multi_language_schema_refactor.sql` for complete SQL migration.

**Quick Overview:**

### 1. Update `users` table
```sql
ALTER TABLE users ADD COLUMN target_language VARCHAR(2) DEFAULT 'es';
ALTER TABLE users ADD CONSTRAINT users_target_language_check 
CHECK (target_language IN ('es', 'pt'));
```

### 2. Update `topics` table
```sql
-- Add target_language and generic name/description columns
ALTER TABLE topics ADD COLUMN target_language VARCHAR(2) DEFAULT 'es';
ALTER TABLE topics ADD COLUMN name VARCHAR(255);
ALTER TABLE topics ADD COLUMN description TEXT;

-- Migrate existing data from name_es/description_es to generic fields
UPDATE topics SET name = name_es WHERE name IS NULL;
UPDATE topics SET description = description_es WHERE description IS NULL;

-- Add constraint
ALTER TABLE topics ADD CONSTRAINT topics_target_language_check 
CHECK (target_language IN ('es', 'pt'));
```

### 3. Update `exercises` table
```sql
-- Add target_language and generic title/description columns
ALTER TABLE exercises ADD COLUMN target_language VARCHAR(2) DEFAULT 'es';
ALTER TABLE exercises ADD COLUMN title VARCHAR(255);
ALTER TABLE exercises ADD COLUMN description TEXT;

-- Migrate existing data
UPDATE exercises SET title = title_es WHERE title IS NULL;
UPDATE exercises SET description = description_es WHERE description IS NULL;

-- Add constraint
ALTER TABLE exercises ADD CONSTRAINT exercises_target_language_check 
CHECK (target_language IN ('es', 'pt'));
```

### 4. Update `levels` table
```sql
-- Add generic description column
ALTER TABLE levels ADD COLUMN description TEXT;

-- Migrate existing data
UPDATE levels SET description = description_es WHERE description IS NULL;
```

### 5. Update `user_level_progress` table
```sql
-- Add target_language to track progress per language
ALTER TABLE user_level_progress ADD COLUMN target_language VARCHAR(2) DEFAULT 'es';

-- Add constraint
ALTER TABLE user_level_progress ADD CONSTRAINT user_level_progress_target_language_check 
CHECK (target_language IN ('es', 'pt'));

-- Update unique constraint to include language (allows separate progress per language)
ALTER TABLE user_level_progress DROP CONSTRAINT IF EXISTS user_level_progress_user_id_level_key;
ALTER TABLE user_level_progress ADD CONSTRAINT user_level_progress_user_id_level_language_key 
UNIQUE (user_id, level, target_language);
```

### 6. Exercise Content JSON Structure
The `content` JSONB column now uses **generic field names** instead of language-specific ones:

**New Structure (Generic):**
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "translation",
      "question": "Oversæt til spansk: Jeg hedder Maria",
      "correct_answer": "Me llamo Maria",
      "explanation": "Forklaring på dansk",
      "sentence_translation": "Jeg hedder Maria"
    }
  ],
  "instructions": "Instruktioner på dansk"
}
```

**Old Structure (Language-Specific - Deprecated):**
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "translation",
      "question_da": "Oversæt til spansk/portugisisk: Jeg hedder Maria",
      "question_es": "Me llamo Maria",
      "question_pt": "Eu me chamo Maria",
      "correct_answer": "Me llamo Maria",
      "explanation_da": "Forklaring på dansk",
      "sentence_translation_da": "Jeg hedder Maria"
    }
  ],
  "instructions_da": "Instruktioner på dansk"
}
```

The target_language field on the exercise row determines which language the content represents.

## Code Changes Implemented

### 1. Type Definitions (`src/types/database.ts`)
- Added `TargetLanguage` type supporting 'es' and 'pt'
- Renamed `SpanishLevel` to `ProficiencyLevel` (kept alias for compatibility)
- **Refactored all interfaces to use generic field names:**
  - `Topic`: Uses `name` and `description` instead of `name_es/name_pt/description_es/description_pt`
  - `Exercise`: Uses `title`, `description`, and `question` instead of language-specific variants
  - All entities include `target_language` field

### 2. Language Utilities (`src/lib/utils/language.ts`)
- Language metadata (names, flags, colors)
- Proficiency level names in each language
- **Removed deprecated helper functions** (getQuestionField, getNameField, etc.) - no longer needed with generic fields

### 3. UI Components
- **LanguageSelector**: Component for choosing target language
  - Compact variant for forms
  - Full variant for settings pages
- **AppHeader**: Updated to show current target language indicator
- **AuthForm**: Added language selection during registration
- **TopicExercisePlayer**: Updated to use generic `question` field from exercises
- **LearningPath**: Updated to use generic `name` field from topics

### 4. API Updates
- **signup route**: Accepts and stores `targetLanguage` parameter
- **level/[level] page**: Filters topics and exercises by user's `target_language`
- **user-levels API**: Filters progress by `target_language`
- **admin/duplicate-content-for-language**: Duplicates content with new `target_language` value

## Next Steps

### Immediate (Required for Production)
1. **Run database migration**: Execute `migrations/01_multi_language_schema_refactor.sql` in Supabase SQL Editor
2. **Verify migration**:
   ```sql
   -- Check all records have target_language
   SELECT COUNT(*) FROM topics WHERE target_language IS NULL;
   SELECT COUNT(*) FROM exercises WHERE target_language IS NULL;
   
   -- Check language distribution
   SELECT target_language, COUNT(*) FROM topics GROUP BY target_language;
   SELECT target_language, COUNT(*) FROM exercises GROUP BY target_language;
   ```
3. **Update any remaining component references** to use generic field names (name, description, question)

### Content Creation
4. **Create Portuguese content** using the admin duplicate tool:
   - Navigate to admin panel → Duplicate Content
   - Select Spanish topics to duplicate for Portuguese
   - Review and translate content as needed

5. **Update AI Configuration**:
   - Modify prompts to generate content in target language
   - Update system prompts to handle multiple languages
   - Test exercise generation for Portuguese

### UI/UX Improvements
5. **Update component references**:
   - Replace hardcoded "Spansk" with dynamic language names
   - Update page titles to reflect selected language
   - Add language switching in user settings

6. **Filter content by language**:
   - Dashboard should only show topics for user's target language
   - Level pages filter by language
   - Exercise lists filter by language

### Testing
7. **Test flows**:
   - [ ] New user registration with language selection
   - [ ] Existing user language preference
   - [ ] Exercise generation for Portuguese
   - [ ] Progress tracking per language
   - [ ] Language switching (if implemented)

## Adding More Languages

To add a new language (e.g., French 'fr'):

1. Update `TargetLanguage` type in `database.ts`:
   ```typescript
   export type TargetLanguage = 'es' | 'pt' | 'fr';
   ```

2. Add language info in `language.ts`:
   ```typescript
   fr: {
     code: 'fr',
     name: 'French',
     nativeName: 'Français',
     flag: '🇫🇷',
     color: '#0055A4'
   }
   ```

3. Update database constraints:
   ```sql
   ALTER TABLE users DROP CONSTRAINT users_target_language_check;
   ALTER TABLE users ADD CONSTRAINT users_target_language_check 
   CHECK (target_language IN ('es', 'pt', 'fr'));
   ```

4. Add French columns to tables (name_fr, description_fr, etc.)

5. Update AI prompts to support French generation

## Migration Checklist

- [ ] Backup database
- [ ] Run ALTER TABLE statements
- [ ] Update existing records with default values
- [ ] Test user registration with language selection
- [ ] Verify existing users can still log in
- [ ] Test exercise display with Portuguese (once content added)
- [ ] Update environment variables if needed
- [ ] Deploy changes
- [ ] Monitor error logs

## Backward Compatibility

All changes maintain backward compatibility:
- Existing users default to Spanish ('es')
- `SpanishLevel` type alias still works
- Default values prevent null issues
- Optional Portuguese fields don't break existing queries

-- Add user_topic_progress table for tracking current position within topics
-- This allows users to resume topics from where they left off

CREATE TABLE IF NOT EXISTS user_topic_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per topic
  UNIQUE(user_id, topic_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_id ON user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_topic_id ON user_topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_topic ON user_topic_progress(user_id, topic_id);

-- Enable Row Level Security
ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own topic progress" ON user_topic_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic progress" ON user_topic_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topic progress" ON user_topic_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topic progress" ON user_topic_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Update the last_updated timestamp automatically
CREATE OR REPLACE FUNCTION update_user_topic_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_topic_progress_updated_at
  BEFORE UPDATE ON user_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_topic_progress_updated_at();

-- Add helpful comments
COMMENT ON TABLE user_topic_progress IS 'Tracks user progress through topic question sequences for resume functionality';
COMMENT ON COLUMN user_topic_progress.current_question_index IS 'Zero-based index of the current question in the sequence';
COMMENT ON COLUMN user_topic_progress.last_updated IS 'Timestamp of last progress update';
-- Simple RLS Enable Script
-- Run these commands one by one in your Supabase SQL Editor

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 2. Basic policies for authenticated users

-- Levels: Everyone can read
CREATE POLICY "levels_read_policy" ON levels
    FOR SELECT USING (auth.role() = 'authenticated');

-- Topics: Everyone can read
CREATE POLICY "topics_read_policy" ON topics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Exercises: Everyone can read
CREATE POLICY "exercises_read_policy" ON exercises
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users: Users can only see/edit their own data
CREATE POLICY "users_own_data_policy" ON users
    FOR ALL USING (auth.uid() = id);

-- User Progress: Users can only access their own progress
CREATE POLICY "user_progress_own_data_policy" ON user_progress
    FOR ALL USING (auth.uid() = user_id);

-- 3. Admin policies (for your admin emails)
CREATE POLICY "admin_full_access_users" ON users
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (
            'admin@spanskgrammatik.dk',
            'anders.houlberg-niel@itera.no'
        )
    );

CREATE POLICY "admin_full_access_levels" ON levels
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (
            'admin@spanskgrammatik.dk',
            'anders.houlberg-niel@itera.no'
        )
    );

CREATE POLICY "admin_full_access_topics" ON topics
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (
            'admin@spanskgrammatik.dk',
            'anders.houlberg-niel@itera.no'
        )
    );

CREATE POLICY "admin_full_access_exercises" ON exercises
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (
            'admin@spanskgrammatik.dk',
            'anders.houlberg-niel@itera.no'
        )
    );

CREATE POLICY "admin_full_access_progress" ON user_progress
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (
            'admin@spanskgrammatik.dk',
            'anders.houlberg-niel@itera.no'
        )
    );

-- 4. Grant basic permissions to authenticated users
GRANT SELECT ON levels TO authenticated;
GRANT SELECT ON topics TO authenticated;
GRANT SELECT ON exercises TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_progress TO authenticated;

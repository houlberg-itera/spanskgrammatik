-- Enable Row Level Security (RLS) for all tables
-- This will remove the "Unrestricted" status in Supabase dashboard

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on levels table
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- Enable RLS on topics table
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on exercises table
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_progress table
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON levels;
DROP POLICY IF EXISTS "Enable read access for all users" ON topics;
DROP POLICY IF EXISTS "Enable read access for all users" ON exercises;
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
DROP POLICY IF EXISTS "Admin can manage all data" ON users;
DROP POLICY IF EXISTS "Admin can manage all data" ON levels;
DROP POLICY IF EXISTS "Admin can manage all data" ON topics;
DROP POLICY IF EXISTS "Admin can manage all data" ON exercises;
DROP POLICY IF EXISTS "Admin can manage all data" ON user_progress;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Admin can manage all user data
CREATE POLICY "Admin can manage all data" ON users
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                'admin@spanskgrammatik.dk',
                'anders.houlberg-niel@itera.no'
            )
        )
    );

-- Levels table policies (read-only for all authenticated users)
CREATE POLICY "Enable read access for all users" ON levels
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin can manage levels
CREATE POLICY "Admin can manage all data" ON levels
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                'admin@spanskgrammatik.dk',
                'anders.houlberg-niel@itera.no'
            )
        )
    );

-- Topics table policies (read-only for all authenticated users)
CREATE POLICY "Enable read access for all users" ON topics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin can manage topics
CREATE POLICY "Admin can manage all data" ON topics
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                'admin@spanskgrammatik.dk',
                'anders.houlberg-niel@itera.no'
            )
        )
    );

-- Exercises table policies (read-only for all authenticated users)
CREATE POLICY "Enable read access for all users" ON exercises
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin can manage exercises
CREATE POLICY "Admin can manage all data" ON exercises
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                'admin@spanskgrammatik.dk',
                'anders.houlberg-niel@itera.no'
            )
        )
    );

-- User Progress table policies (users can only access their own progress)
CREATE POLICY "Users can view their own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin can manage all progress data
CREATE POLICY "Admin can manage all data" ON user_progress
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                'admin@spanskgrammatik.dk',
                'anders.houlberg-niel@itera.no'
            )
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON levels TO authenticated;
GRANT SELECT ON topics TO authenticated;
GRANT SELECT ON exercises TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_progress TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

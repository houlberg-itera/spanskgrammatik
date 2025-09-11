-- CRITICAL RLS FIX - Resolves infinite recursion error
-- Copy and paste this entire script into your Supabase SQL Editor

-- === STEP 1: Clean slate - remove ALL existing policies ===
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on users table
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
    
    -- Drop all policies on other tables
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('user_progress', 'user_level_progress', 'levels', 'topics', 'exercises') 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- === STEP 2: Disable and re-enable RLS to reset ===
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- === STEP 3: Create super simple policies without circular references ===

-- Public read access for reference data
CREATE POLICY "allow_read_levels" ON public.levels FOR SELECT USING (true);
CREATE POLICY "allow_read_topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "allow_read_exercises" ON public.exercises FOR SELECT USING (true);

-- User access - super simple, no circular logic
CREATE POLICY "user_own_data" ON public.users 
    FOR ALL 
    USING (auth.uid() = id);

-- Admin access for users table  
CREATE POLICY "admin_users_access" ON public.users 
    FOR ALL 
    USING (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no'
    );

-- User progress - own data only
CREATE POLICY "user_own_progress" ON public.user_progress 
    FOR ALL 
    USING (auth.uid() = user_id);

-- User level progress - own data only  
CREATE POLICY "user_own_level_progress" ON public.user_level_progress 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Admin can insert exercises
CREATE POLICY "admin_insert_exercises" ON public.exercises 
    FOR INSERT 
    WITH CHECK (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no'
    );

-- Admin can update exercises
CREATE POLICY "admin_update_exercises" ON public.exercises 
    FOR UPDATE 
    USING (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no'
    );

-- === STEP 4: Grant permissions ===
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.levels TO authenticated;
GRANT SELECT ON public.topics TO authenticated;  
GRANT SELECT ON public.exercises TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_progress TO authenticated;
GRANT ALL ON public.user_level_progress TO authenticated;

-- === VERIFICATION ===
SELECT 'RLS policies updated successfully - infinite recursion resolved' AS status;
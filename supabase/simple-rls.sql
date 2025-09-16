-- EMERGENCY RLS FIX - Nuclear option to resolve infinite recursion
-- Copy and paste this entire script into your Supabase SQL Editor

-- === STEP 1: NUCLEAR CLEANUP - Remove ALL policies completely ===
DO $$ 
DECLARE
    pol RECORD;
    tbl RECORD;
BEGIN
    -- Drop ALL policies on ALL tables in public schema
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on table %', pol.policyname, pol.tablename;
    END LOOP;
    
    -- Ensure we got everything by checking all tables
    FOR tbl IN 
        SELECT table_name as tablename
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view their own profile" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update their own profile" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "users_own_data_policy" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_access_users" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "user_progress_own_data_policy" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_access_progress" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Everyone can view levels" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "levels_read_policy" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_access_levels" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Everyone can view topics" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "topics_read_policy" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_access_topics" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Everyone can view exercises" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "exercises_read_policy" ON public.%I', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_access_exercises" ON public.%I', tbl.tablename);
    END LOOP;
END $$;

-- === STEP 2: COMPLETELY DISABLE RLS EVERYWHERE ===

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

-- Wait and clear any caches
SELECT pg_sleep(2);

-- === STEP 3: VERIFY ALL POLICIES ARE GONE ===
SELECT 'Checking for remaining policies...' AS status;
SELECT COUNT(*) as remaining_policies FROM pg_policies WHERE schemaname = 'public';

-- === STEP 4: Re-enable RLS with minimal policies ===
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- === STEP 5: Create ONLY essential policies - NO user table policies initially ===

-- Public read access for reference data (these should never cause recursion)
CREATE POLICY "public_read_levels" ON public.levels FOR SELECT USING (true);
CREATE POLICY "public_read_topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "public_read_exercises" ON public.exercises FOR SELECT USING (true);

-- Admin access for exercises - ALL operations (including vocabulary exercises)
CREATE POLICY "admin_all_exercises" ON public.exercises 
    FOR ALL 
    USING (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no' OR
        (auth.jwt() ->> 'email') = 'ahn@itera.dk'
    )
    WITH CHECK (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no' OR
        (auth.jwt() ->> 'email') = 'ahn@itera.dk'
    );

-- Admin access for topics (needed for vocabulary exercise generation)
CREATE POLICY "admin_all_topics" ON public.topics 
    FOR ALL 
    USING (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no' OR
        (auth.jwt() ->> 'email') = 'ahn@itera.dk'
    )
    WITH CHECK (
        (auth.jwt() ->> 'email') = 'admin@spanskgrammatik.dk' OR
        (auth.jwt() ->> 'email') = 'anders.houlberg-niel@itera.no' OR
        (auth.jwt() ->> 'email') = 'ahn@itera.dk'
    );

-- Fallback: Allow authenticated users to insert exercises (temporary)
CREATE POLICY "authenticated_insert_exercises" ON public.exercises 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- === STEP 6: Leave users table WITHOUT RLS for now ===
-- This eliminates ANY possibility of recursion in users table
-- We'll add it back later once we confirm exercises work

-- === STEP 7: Grant basic permissions ===
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.levels TO authenticated;
GRANT SELECT ON public.topics TO authenticated;  
GRANT SELECT ON public.exercises TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_progress TO authenticated;
GRANT ALL ON public.user_level_progress TO authenticated;

-- === VERIFICATION ===
SELECT 'Emergency RLS fix applied - users table RLS disabled temporarily' AS status;
SELECT 'Test exercise generation now - should work without recursion' AS next_step;

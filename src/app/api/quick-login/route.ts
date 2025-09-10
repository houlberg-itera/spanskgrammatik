import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        console.log('=== QUICK LOGIN TEST ===')
        
        // Test user credentials
        const testCredentials = {
            email: 'test@example.com',
            password: 'password123'
        }
        
        console.log('Attempting to login:', testCredentials.email)
        
        const supabase = await createClient()
        
        // Attempt login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: testCredentials.email,
            password: testCredentials.password
        })
        
        if (authError) {
            console.error('Login error:', authError)
            return NextResponse.json({
                success: false,
                error: 'Login failed',
                details: authError.message,
                code: authError.name,
                testCredentials
            })
        }
        
        console.log('Login successful:', authData.user?.id)
        
        // Test current session
        const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
        
        // Test database access with authenticated user
        let progressTest = null
        if (currentUser) {
            try {
                const { data: progressData, error: progressError } = await supabase
                    .from('user_progress')
                    .select('*')
                    .eq('user_id', currentUser.id)
                
                progressTest = {
                    hasAccess: !progressError,
                    error: progressError?.message,
                    existingProgress: progressData?.length || 0
                }
            } catch (err) {
                progressTest = {
                    hasAccess: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                }
            }
        }
        
        return NextResponse.json({
            success: true,
            message: 'Login test completed successfully',
            loginResult: {
                userId: authData.user?.id,
                email: authData.user?.email,
                emailConfirmed: !!authData.user?.email_confirmed_at,
                sessionCreated: !!authData.session,
                accessToken: authData.session?.access_token ? '[PROVIDED]' : null
            },
            currentSessionCheck: {
                userFound: !!currentUser,
                sessionActive: !!session,
                userId: currentUser?.id,
                sessionError: sessionError?.message,
                getSessionError: getSessionError?.message
            },
            databaseAccess: progressTest,
            nextSteps: [
                'User successfully logged in',
                'Session is active and authenticated',
                'Ready to test exercise completion',
                'Try visiting /dashboard or completing an exercise'
            ]
        })
        
    } catch (error) {
        console.error('Login test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

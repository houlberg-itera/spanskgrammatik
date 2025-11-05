import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { action, email, password, fullName } = await request.json()
        
        \n        \n        \n        
        const supabase = await createClient()
        
        if (action === 'register') {
            // Test user registration
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            })
            
            if (authError) {
                return NextResponse.json({
                    success: false,
                    action: 'register',
                    error: authError.message,
                    code: authError.name,
                    details: authError
                })
            }
            
            // Check if user was created but needs confirmation
            let userCreated = false
            let needsConfirmation = false
            
            if (authData.user && !authData.user.email_confirmed_at) {
                needsConfirmation = true
                userCreated = true
            } else if (authData.user && authData.user.email_confirmed_at) {
                userCreated = true
                needsConfirmation = false
            }
            
            return NextResponse.json({
                success: true,
                action: 'register',
                userCreated,
                needsConfirmation,
                userId: authData.user?.id,
                email: authData.user?.email,
                emailConfirmed: !!authData.user?.email_confirmed_at,
                sessionCreated: !!authData.session,
                authData: {
                    user: authData.user,
                    session: authData.session ? 'Session created' : 'No session'
                }
            })
        }
        
        if (action === 'login') {
            // Test user login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            
            if (authError) {
                return NextResponse.json({
                    success: false,
                    action: 'login',
                    error: authError.message,
                    code: authError.name,
                    details: authError
                })
            }
            
            return NextResponse.json({
                success: true,
                action: 'login',
                userId: authData.user?.id,
                email: authData.user?.email,
                emailConfirmed: !!authData.user?.email_confirmed_at,
                sessionCreated: !!authData.session,
                authData: {
                    user: authData.user,
                    session: authData.session ? 'Session active' : 'No session'
                }
            })
        }
        
        return NextResponse.json({
            success: false,
            error: 'Invalid action. Use "register" or "login"'
        })
        
    } catch (error) {
        console.error('Auth test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        
        // Get current user session
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Try to get user count from auth.users (might not work due to RLS)
        const { data: authUsers, error: authUsersError } = await supabase
            .from('auth.users')
            .select('id, email, created_at, email_confirmed_at')
        
        // Try to get users from profiles table if it exists
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
        
        return NextResponse.json({
            currentSession: {
                authenticated: !!user,
                user: user ? {
                    id: user.id,
                    email: user.email,
                    emailConfirmed: !!user.email_confirmed_at,
                    createdAt: user.created_at
                } : null,
                sessionExists: !!session,
                userError: userError?.message,
                sessionError: sessionError?.message
            },
            systemUsers: {
                authUsers: {
                    count: authUsers?.length || 0,
                    data: authUsers,
                    error: authUsersError?.message
                },
                profiles: {
                    count: profiles?.length || 0,
                    data: profiles,
                    error: profilesError?.message
                }
            },
            instructions: {
                register: 'POST with { action: "register", email, password, fullName }',
                login: 'POST with { action: "login", email, password }',
                testCredentials: {
                    email: 'test@example.com',
                    password: 'password123',
                    fullName: 'Test User'
                }
            },
            timestamp: new Date().toISOString()
        })
        
    } catch (error) {
        console.error('Auth GET error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

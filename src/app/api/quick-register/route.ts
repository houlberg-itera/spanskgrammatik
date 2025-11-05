import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        // Test user credentials
        const testUser = {
            email: 'test@example.com',
            password: 'password123',
            fullName: 'Test User'
        }
        
               
        // Create admin client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
        
        // First check if user already exists
        const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers()
        
        const userAlreadyExists = existingUsers?.users?.find((u: any) => u.email === testUser.email)
        
        if (userAlreadyExists) {
            return NextResponse.json({
                success: true,
                message: 'User already exists',
                existingUser: {
                    id: userAlreadyExists.id,
                    email: userAlreadyExists.email,
                    emailConfirmed: !!userAlreadyExists.email_confirmed_at,
                    createdAt: userAlreadyExists.created_at
                },
                totalUsers: existingUsers?.users?.length || 0,
                allUsers: existingUsers?.users?.map(u => ({
                    id: u.id,
                    email: u.email,
                    confirmed: !!u.email_confirmed_at
                })) || []
            })
        }
        
        // Create new user with admin privileges (auto-confirmed)
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            user_metadata: {
                full_name: testUser.fullName
            },
            email_confirm: true // Auto-confirm email
        })
        
        if (userError) {
            console.error('User creation error:', userError)
            return NextResponse.json({
                success: false,
                error: 'Failed to create user',
                details: userError.message,
                code: userError.name
            })
        }
        
      
        // Get updated user count
        const { data: updatedUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        return NextResponse.json({
            success: true,
            message: 'Test user created successfully',
            createdUser: {
                id: userData.user?.id,
                email: userData.user?.email,
                emailConfirmed: !!userData.user?.email_confirmed_at,
                createdAt: userData.user?.created_at
            },
            totalUsers: updatedUsers?.users?.length || 0,
            allUsers: updatedUsers?.users?.map(u => ({
                id: u.id,
                email: u.email,
                confirmed: !!u.email_confirmed_at
            })) || [],
            nextSteps: [
                'User is now registered and confirmed',
                'Try logging in with: test@example.com / password123',
                'Test exercise completion and progress saving'
            ]
        })
        
    } catch (error) {
        console.error('Registration test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

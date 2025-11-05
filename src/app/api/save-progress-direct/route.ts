import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Direct progress saving that bypasses the problematic RPC function
export async function POST(request: NextRequest) {
    try {
        const { exerciseId, score } = await request.json()
        
        console.log('=== DIRECT PROGRESS SAVE (BYPASSING RPC) ===')
        \n        
        const supabase = await createClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                details: userError?.message
            }, { status: 401 })
        }
        
        // Validate inputs
        if (!exerciseId || typeof score !== 'number') {
            return NextResponse.json({
                success: false,
                error: 'Missing required parameters: exerciseId and score'
            }, { status: 400 })
        }
        
        \n        \n        
        // First check if the exercise exists
        const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .select('id, title_da, level')
            .eq('id', exerciseId)
            .single()
        
        if (exerciseError || !exercise) {
            return NextResponse.json({
                success: false,
                error: 'Exercise not found',
                exerciseId,
                exerciseError: exerciseError?.message
            }, { status: 404 })
        }
        
        \n        
        // Check if progress already exists
        const { data: existingProgress, error: checkError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', exerciseId)
            .single()
        
        let result
        let operation = existingProgress ? 'update' : 'insert'
        
        if (existingProgress) {
            // Update existing progress
            \n            const { data, error } = await supabase
                .from('user_progress')
                .update({
                    score: score,
                    completed: score >= 70,
                    attempts: (existingProgress.attempts || 0) + 1,
                    completed_at: score >= 70 ? new Date().toISOString() : existingProgress.completed_at,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('exercise_id', exerciseId)
                .select()
            
            result = { data, error }
        } else {
            // Insert new progress - using ONLY columns that exist in the schema
            \n            const { data, error } = await supabase
                .from('user_progress')
                .insert({
                    user_id: user.id,
                    exercise_id: exerciseId,
                    completed: score >= 70,
                    score: score,
                    attempts: 1,
                    completed_at: score >= 70 ? new Date().toISOString() : null
                    // NOT including topic_id - it doesn't exist in user_progress table
                    // NOT including updated_at in insert - it's auto-generated
                })
                .select()
            
            result = { data, error }
        }
        
        if (result.error) {
            console.error('Database error:', result.error)
            return NextResponse.json({
                success: false,
                error: 'Failed to save progress',
                operation,
                dbError: result.error.message,
                details: result.error
            }, { status: 500 })
        }
        
        \n        
        return NextResponse.json({
            success: true,
            message: 'Progress saved successfully using direct database access',
            operation,
            data: {
                userId: user.id,
                exerciseId,
                exerciseTitle: exercise.title_da,
                score,
                passed: score >= 70,
                savedProgress: result.data?.[0] // Get the first result with null check
            },
            troubleshooting: {
                rpcFunctionBypass: 'Successfully bypassed problematic RPC function',
                schemaCompliant: 'Used only columns that exist in user_progress table',
                noTopicIdIssue: 'Did not attempt to insert topic_id into user_progress'
            }
        })
        
    } catch (error) {
        console.error('Direct progress save error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

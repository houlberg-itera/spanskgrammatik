import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        console.log('=== TESTING DIRECT PROGRESS SAVE ===')
        
        const supabase = await createClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: 'User not authenticated',
                details: userError?.message
            })
        }
        
        // Test data
        const testExerciseId = 15  // Try a different exercise
        const testScore = 95
        
        console.log('Testing with user:', user.id, 'exercise:', testExerciseId, 'score:', testScore)
        
        // Make a request to our direct save endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/save-progress-direct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': '' // This won't include the session cookie, so we'll use the session from this context
            },
            body: JSON.stringify({
                exerciseId: testExerciseId,
                score: testScore
            })
        })
        
        const result = await response.json()
        
        // Also do the direct save in this context to avoid cookie issues
        const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .select('id, title_da, level')
            .eq('id', testExerciseId)
            .single()
        
        if (exerciseError || !exercise) {
            return NextResponse.json({
                success: false,
                error: 'Test exercise not found',
                exerciseId: testExerciseId
            })
        }
        
        // Check existing progress
        const { data: existingProgress, error: checkError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', testExerciseId)
            .single()
        
        let saveResult
        let operation = existingProgress ? 'update' : 'insert'
        
        if (existingProgress) {
            // Update existing
            const { data, error } = await supabase
                .from('user_progress')
                .update({
                    score: testScore,
                    completed: testScore >= 70,
                    attempts: (existingProgress.attempts || 0) + 1,
                    completed_at: testScore >= 70 ? new Date().toISOString() : existingProgress.completed_at,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('exercise_id', testExerciseId)
                .select()
            
            saveResult = { data, error }
        } else {
            // Insert new - using ONLY schema-compliant columns
            const { data, error } = await supabase
                .from('user_progress')
                .insert({
                    user_id: user.id,
                    exercise_id: testExerciseId,
                    completed: testScore >= 70,
                    score: testScore,
                    attempts: 1,
                    completed_at: testScore >= 70 ? new Date().toISOString() : null
                })
                .select()
            
            saveResult = { data, error }
        }
        
        // Get all user progress
        const { data: allProgress, error: allProgressError } = await supabase
            .from('user_progress')
            .select(`
                *,
                exercises (id, title_da, level)
            `)
            .eq('user_id', user.id)
            .order('id', { ascending: false })
        
        return NextResponse.json({
            success: !saveResult.error,
            message: saveResult.error ? 'Progress save failed' : 'Progress saved successfully',
            operation,
            testData: {
                userId: user.id,
                exerciseId: testExerciseId,
                exerciseTitle: exercise.title_da,
                score: testScore
            },
            directSave: {
                success: !saveResult.error,
                data: saveResult.data,
                error: saveResult.error ? saveResult.error.message : null
            },
            userProgressSummary: {
                totalEntries: allProgress?.length || 0,
                completedExercises: allProgress?.filter(p => p.completed)?.length || 0,
                recentEntries: allProgress?.slice(0, 3).map(p => ({
                    id: p.id,
                    exerciseId: p.exercise_id,
                    exerciseTitle: p.exercises?.title_da,
                    score: p.score,
                    completed: p.completed,
                    attempts: p.attempts
                })) || []
            },
            troubleshooting: {
                schemaCompliance: 'Used only columns that exist in user_progress table',
                noTopicId: 'Did not attempt to insert topic_id',
                noRpcFunction: 'Bypassed problematic RPC function entirely'
            }
        })
        
    } catch (error) {
        console.error('Progress test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        console.log('=== BASIC PROGRESS TEST (Direct Insert) ===')
        
        const supabase = await createClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: 'User not authenticated',
                details: userError?.message,
                instructions: 'Please run /api/quick-login first'
            })
        }
        
        console.log('Testing basic progress save for user:', user.id)
        
        // Test with exercise ID 14 (one of our sample exercises)
        const testExerciseId = 14
        const testScore = 90
        
        // First check if the exercise exists
        const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .select('id, title_da, level')
            .eq('id', testExerciseId)
            .single()
        
        if (exerciseError || !exercise) {
            return NextResponse.json({
                success: false,
                error: 'Exercise not found',
                exerciseId: testExerciseId,
                exerciseError: exerciseError?.message
            })
        }
        
        console.log('Exercise found:', exercise.title_da)
        
        // Check if progress already exists
        const { data: existingProgress, error: checkError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', testExerciseId)
            .single()
        
        let result
        let operation = existingProgress ? 'update' : 'insert'
        
        if (existingProgress) {
            // Update existing progress
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
            
            result = { data, error }
        } else {
            // Insert new progress - only using columns that exist in the schema
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
            
            result = { data, error }
        }
        
        if (result.error) {
            console.error('Progress save error:', result.error)
            return NextResponse.json({
                success: false,
                error: 'Failed to save progress',
                operation,
                dbError: result.error.message,
                exercise: exercise
            })
        }
        
        console.log('Basic progress save successful')
        
        // Get all user progress to verify
        const { data: allProgress, error: allProgressError } = await supabase
            .from('user_progress')
            .select(`
                *,
                exercises (id, title_da, level)
            `)
            .eq('user_id', user.id)
        
        return NextResponse.json({
            success: true,
            message: 'Basic progress saving successful',
            operation,
            testData: {
                userId: user.id,
                exerciseId: testExerciseId,
                exerciseTitle: exercise.title_da,
                score: testScore,
                passed: testScore >= 70
            },
            savedProgress: {
                success: !result.error,
                data: result.data,
                error: result.error ? String(result.error) : undefined
            },
            userProgressSummary: {
                totalAttempts: allProgress?.length || 0,
                completedExercises: allProgress?.filter(p => p.completed)?.length || 0,
                exercises: allProgress?.map(p => ({
                    exerciseId: p.exercise_id,
                    title: p.exercises?.title_da,
                    score: p.score,
                    completed: p.completed,
                    attempts: p.attempts
                })) || [],
                error: allProgressError?.message
            },
            nextSteps: [
                'Basic progress saving working correctly',
                'Exercise completion recorded in database',
                'User can now complete exercises in the app',
                'Original error "Der opstod en fejl ved at gemme din fremgang" should be fixed',
                'Test by completing a real exercise in the app'
            ]
        })
        
    } catch (error) {
        console.error('Basic progress test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

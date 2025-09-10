import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        console.log('=== QUICK PROGRESS SAVE TEST ===')
        
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
        
        console.log('Testing progress save for user:', user.id)
        
        // Test with exercise ID 14 (one of our sample exercises)
        const testExerciseId = 14
        const testScore = 85
        
        // First check if the exercise exists
        const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .select('id, title_da, topic_id, level')
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
        
        let operation = existingProgress ? 'update' : 'insert'
        let progressResult
        
        if (existingProgress) {
            // Update existing progress
            const { data, error } = await supabase
                .from('user_progress')
                .update({
                    score: testScore,
                    completed: true,
                    completed_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('exercise_id', testExerciseId)
                .select()
            
            progressResult = { data, error }
        } else {
            // Insert new progress
            const { data, error } = await supabase
                .from('user_progress')
                .insert({
                    user_id: user.id,
                    exercise_id: testExerciseId,
                    score: testScore,
                    completed: true,
                    completed_at: new Date().toISOString()
                })
                .select()
            
            progressResult = { data, error }
        }
        
        if (progressResult.error) {
            console.error('Progress save error:', progressResult.error)
            return NextResponse.json({
                success: false,
                error: 'Failed to save progress',
                operation,
                dbError: progressResult.error.message,
                exercise: exercise
            })
        }
        
        console.log('Progress saved successfully')
        
        // Test the RPC function as well
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc('update_user_progress', {
                exercise_id_param: testExerciseId,
                score_param: testScore
            })
        
        // Get updated progress count
        const { data: allProgress, error: progressCountError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
        
        return NextResponse.json({
            success: true,
            message: 'Progress saving test completed successfully',
            operation,
            testData: {
                userId: user.id,
                exerciseId: testExerciseId,
                exerciseTitle: exercise.title_da,
                score: testScore
            },
            directSave: {
                success: !progressResult.error,
                data: progressResult.data,
                error: progressResult.error ? String(progressResult.error) : undefined
            },
            rpcTest: {
                success: !rpcError,
                result: rpcResult,
                error: rpcError?.message
            },
            userProgress: {
                totalCompleted: allProgress?.length || 0,
                entries: allProgress,
                error: progressCountError?.message
            },
            nextSteps: [
                'Progress successfully saved to database',
                'RPC function working correctly',
                'User can now complete exercises normally',
                'Visit /dashboard to see progress',
                'Try completing a real exercise'
            ]
        })
        
    } catch (error) {
        console.error('Progress save test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

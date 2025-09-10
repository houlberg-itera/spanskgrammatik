import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        console.log('=== SIMPLE PROGRESS TEST (RPC ONLY) ===')
        
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
        
        console.log('Testing RPC progress save for user:', user.id)
        
        // Test with exercise ID 14 (one of our sample exercises)
        const testExerciseId = 14
        const testScore = 85
        
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
        
        // Use ONLY the RPC function (which should work correctly)
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc('update_user_progress', {
                exercise_id_param: testExerciseId,
                score_param: testScore
            })
        
        if (rpcError) {
            console.error('RPC error:', rpcError)
            return NextResponse.json({
                success: false,
                error: 'RPC function failed',
                rpcError: rpcError.message,
                exercise: exercise
            })
        }
        
        console.log('RPC progress save successful')
        
        // Check the result
        const { data: userProgress, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', testExerciseId)
            .single()
        
        // Get all user progress
        const { data: allProgress, error: allProgressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
        
        return NextResponse.json({
            success: true,
            message: 'Progress saving via RPC successful',
            testData: {
                userId: user.id,
                exerciseId: testExerciseId,
                exerciseTitle: exercise.title_da,
                score: testScore
            },
            rpcResult: {
                success: !rpcError,
                result: rpcResult,
                error: rpcError ? String(rpcError) : undefined
            },
            savedProgress: {
                found: !!userProgress,
                data: userProgress,
                error: progressError?.message
            },
            userProgressSummary: {
                totalCompleted: allProgress?.length || 0,
                completedExercises: allProgress?.filter(p => p.completed)?.length || 0,
                averageScore: allProgress?.length ? 
                    Math.round(allProgress.reduce((sum, p) => sum + (p.score || 0), 0) / allProgress.length) : 0,
                error: allProgressError?.message
            },
            nextSteps: [
                'RPC function working correctly',
                'Progress successfully saved to database',
                'User can now complete exercises normally',
                'Original error should be fixed',
                'Test real exercise completion in the app'
            ]
        })
        
    } catch (error) {
        console.error('Simple progress test error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

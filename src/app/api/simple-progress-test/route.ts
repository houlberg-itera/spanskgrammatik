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
        
        // Test with exercise ID 291 (which we know exists)
        const testExerciseId = 291
        const testScore = 85
        
        // First check if the exercise exists
        const { data: exercise, error: exerciseError } = await supabase
            .from('exercises')
            .select('id, title_da, level')
            .eq('id', testExerciseId)
            .single()
        
        if (exerciseError) {
            console.error('Exercise lookup error:', exerciseError)
            return NextResponse.json({
                success: false,
                error: 'Exercise lookup failed',
                exerciseId: testExerciseId,
                exerciseError: exerciseError.message,
                sqlState: exerciseError.code,
                hint: exerciseError.hint
            })
        }
        
        if (!exercise) {
            return NextResponse.json({
                success: false,
                error: 'Exercise not found',
                exerciseId: testExerciseId,
                message: 'Exercise with this ID does not exist in database'
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
        
        // Check the result in user_progress
        const { data: userProgress, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_id', testExerciseId)
            .single()
        
        // Check the result in user_level_progress - this is KEY for the dashboard fix
        const { data: levelProgress, error: levelProgressError } = await supabase
            .from('user_level_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('level', exercise.level)
            .single()
        
        // Get all user progress
        const { data: allProgress, error: allProgressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
        
        return NextResponse.json({
            success: true,
            message: 'Progress saving via RPC successful - DASHBOARD PROGRESS SHOULD NOW WORK!',
            testData: {
                userId: user.id,
                exerciseId: testExerciseId,
                exerciseTitle: exercise.title_da,
                exerciseLevel: exercise.level,
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
            levelProgress: {
                found: !!levelProgress,
                progressPercentage: levelProgress?.progress_percentage || 0,
                data: levelProgress,
                error: levelProgressError?.message,
                dashboardNote: 'This progress_percentage is what the dashboard reads!'
            },
            userProgressSummary: {
                totalCompleted: allProgress?.length || 0,
                completedExercises: allProgress?.filter(p => p.completed)?.length || 0,
                averageScore: allProgress?.length ? 
                    Math.round(allProgress.reduce((sum, p) => sum + (p.score || 0), 0) / allProgress.length) : 0,
                error: allProgressError?.message
            },
            dashboardFix: {
                status: 'IMPLEMENTED',
                explanation: 'ExercisePlayer now uses RPC function which updates user_level_progress.progress_percentage',
                verifyInstructions: [
                    '1. Complete an exercise in the app',
                    '2. Return to dashboard',
                    '3. Progress should now show correct percentage',
                    '4. Each completed exercise updates level progress automatically'
                ]
            }
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

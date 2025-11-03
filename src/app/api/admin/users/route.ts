import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get session to verify admin access
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin status directly
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean);
    const userEmail = session.user?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get comprehensive user data from both auth.users and public.users
    // First try to get public users data
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        current_level,
        created_at,
        updated_at
      `);

    if (publicError) {
      console.error('Error fetching public users:', publicError);
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    // For now, let's use public users as the primary source
    // Later we can enhance with auth.users data if needed
    const allUsers = publicUsers || [];

    // Get user progress statistics
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        user_id,
        exercise_id,
        completed_at
      `);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
    }

    // Combine and enrich user data
    const enrichedUsers = allUsers.map(user => {
      const userProgressData = userProgress?.filter(up => up.user_id === user.id) || [];
      
      // Calculate statistics
      const totalExercises = userProgressData.length;
      const totalQuestions = userProgressData.reduce((sum, progress) => {
        // Count questions in each exercise (simplified - could be enhanced)
        return sum + 1; // Each progress record represents completed questions
      }, 0);

      const lastActivity = userProgressData.length > 0 
        ? userProgressData.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at
        : null;

      return {
        id: user.id,
        email: user.email || '',
        full_name: user.full_name || null,
        current_level: user.current_level || 'A1',
        created_at: user.created_at,
        updated_at: user.updated_at,
        is_admin: adminEmails.includes(user.email || ''),
        last_sign_in_at: null, // Not available from public.users
        email_confirmed_at: null, // Not available from public.users
        total_exercises: totalExercises,
        total_questions: totalQuestions,
        last_activity: lastActivity
      };
    });

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalUsers: enrichedUsers.length,
      totalAdmins: enrichedUsers.filter(user => user.is_admin).length,
      activeUsersToday: enrichedUsers.filter(user => 
        user.last_activity && new Date(user.last_activity) >= today
      ).length,
      newUsersThisWeek: enrichedUsers.filter(user => 
        new Date(user.created_at) >= weekAgo
      ).length
    };

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      stats
    });

  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
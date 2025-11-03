import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get session to verify admin access
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin status
    const adminResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/check-admin`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Cookie': `supabase-auth-token=${session.access_token}`
      }
    });

    if (!adminResponse.ok) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get userId from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const userId = pathSegments[pathSegments.length - 1];

    if (!userId || userId === 'route.ts') {
      return NextResponse.json({ 
        error: 'User ID is required in URL path' 
      }, { status: 400 });
    }

    // Get user details before deletion for logging
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userEmail = authUser.user.email;

    // Prevent admin from deleting themselves
    if (session.user?.email === userEmail) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account' 
      }, { status: 400 });
    }

    try {
      // Delete related data first to maintain referential integrity
      
      // Delete user progress data
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId);

      if (progressError) {
        console.error('Error deleting user progress:', progressError);
      }

      // Delete user level progress
      const { error: levelProgressError } = await supabase
        .from('user_level_progress')
        .delete()
        .eq('user_id', userId);

      if (levelProgressError) {
        console.error('Error deleting user level progress:', levelProgressError);
      }

      // Delete user topic progress
      const { error: topicProgressError } = await supabase
        .from('user_topic_progress')
        .delete()
        .eq('user_id', userId);

      if (topicProgressError) {
        console.error('Error deleting user topic progress:', topicProgressError);
      }

      // Delete from public.users table
      const { error: publicDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (publicDeleteError) {
        console.error('Error deleting from public.users:', publicDeleteError);
        // Continue with auth deletion even if public table deletion fails
      }

      // Finally, delete from auth.users
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        return NextResponse.json({ 
          error: `Failed to delete user: ${authDeleteError.message}` 
        }, { status: 500 });
      }

      // Log successful deletion
      console.log(`User successfully deleted: ${userEmail} (${userId})`);

      return NextResponse.json({
        success: true,
        message: `User ${userEmail} has been successfully deleted`,
        deletedUserId: userId,
        deletedUserEmail: userEmail
      });

    } catch (deletionError) {
      console.error('Error during user deletion process:', deletionError);
      return NextResponse.json({ 
        error: 'Failed to complete user deletion process' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in delete user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
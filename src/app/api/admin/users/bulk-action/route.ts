import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, userIds } = body;

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: action and userIds array' 
      }, { status: 400 });
    }

    const validActions = ['promote', 'demote', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      }, { status: 400 });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Get current admin emails from environment variable
    let adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean);

    for (const userId of userIds) {
      try {
        // Get user details
        const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError || !authUser.user) {
          results.push({
            userId,
            success: false,
            error: 'User not found'
          });
          errorCount++;
          continue;
        }

        const userEmail = authUser.user.email;
        
        if (!userEmail) {
          results.push({
            userId,
            success: false,
            error: 'User email not found'
          });
          errorCount++;
          continue;
        }

        switch (action) {
          case 'promote':
            // Add to admin list if not already there
            if (!adminEmails.includes(userEmail)) {
              adminEmails.push(userEmail);
            }
            results.push({
              userId,
              success: true,
              message: `Admin role granted to ${userEmail}`
            });
            successCount++;
            break;

          case 'demote':
            // Remove from admin list
            const initialCount = adminEmails.length;
            adminEmails = adminEmails.filter(email => email !== userEmail);
            
            results.push({
              userId,
              success: true,
              message: `Admin role revoked from ${userEmail}`
            });
            successCount++;
            break;

          case 'delete':
            // Delete user from both auth and public tables
            // First remove from public.users table
            const { error: publicDeleteError } = await supabase
              .from('users')
              .delete()
              .eq('id', userId);

            if (publicDeleteError) {
              console.error('Error deleting from public.users:', publicDeleteError);
            }

            // Then delete from auth.users
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
            
            if (authDeleteError) {
              results.push({
                userId,
                success: false,
                error: `Failed to delete user: ${authDeleteError.message}`
              });
              errorCount++;
            } else {
              // Remove from admin list if they were an admin
              adminEmails = adminEmails.filter(email => email !== userEmail);
              
              results.push({
                userId,
                success: true,
                message: `User ${userEmail} deleted successfully`
              });
              successCount++;
            }
            break;
        }

      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    if (action === 'promote' || action === 'demote') {
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed: ${successCount} successful, ${errorCount} failed`,
      results,
      successCount,
      errorCount,
      ...(action !== 'delete' && {
        note: 'Environment variable ADMIN_EMAILS needs to be updated for persistence',
        updatedAdminEmails: adminEmails
      })
    });

  } catch (error) {
    console.error('Error in bulk-action API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
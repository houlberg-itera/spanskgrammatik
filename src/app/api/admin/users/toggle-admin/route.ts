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
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json({ 
        error: 'Missing required fields: userId and isAdmin' 
      }, { status: 400 });
    }

    // Get current admin emails from environment variable
    let adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean);
    
    // Get user email from auth.users
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userEmail = authUser.user.email;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Update admin emails list
    if (isAdmin) {
      // Add to admin list if not already there
      if (!adminEmails.includes(userEmail)) {
        adminEmails.push(userEmail);
      }
    } else {
      // Remove from admin list
      adminEmails = adminEmails.filter(email => email !== userEmail);
    }

    // Note: In a production environment, you would need to update the environment variable
    // or use a database-based admin role system instead of environment variables
    // For now, this returns the updated status but doesn't persist the change
    
    \n    console.log('Updated admin emails list:', adminEmails.join(', '));
    \n
    return NextResponse.json({
      success: true,
      message: `Admin role ${isAdmin ? 'granted to' : 'revoked from'} user ${userEmail}`,
      userId,
      isAdmin,
      userEmail,
      note: 'Environment variable ADMIN_EMAILS needs to be updated for persistence'
    });

  } catch (error) {
    console.error('Error in toggle-admin API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
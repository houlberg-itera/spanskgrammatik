import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'No active session',
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Check if user email is in admin list
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const userEmail = session.user?.email;
    
    if (!userEmail) {
      return NextResponse.json({ 
        isAdmin: false, 
        error: 'No email found',
        message: 'User email not available' 
      }, { status: 400 });
    }

    const isAdmin = adminEmails.includes(userEmail);
    
    return NextResponse.json({ 
      isAdmin,
      userEmail,
      adminEmails: adminEmails.length, // Don't expose actual emails
      message: isAdmin ? 'Admin access granted' : 'Admin access denied'
    });

  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Internal server error',
      message: 'Failed to check admin status' 
    }, { status: 500 });
  }
}

// Also support POST for consistency
export async function POST(request: NextRequest) {
  return GET(request);
}
